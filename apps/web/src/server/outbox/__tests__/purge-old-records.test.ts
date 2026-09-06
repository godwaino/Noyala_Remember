import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { purgeOldRecords } from "../purge-old-records";

interface DeleteCall {
  table: string;
  statuses: string[];
  cutoffColumn: string;
  cutoff: string;
}

function makeClient(resultsByTable: Record<string, { data: unknown; error: unknown }>) {
  const calls: DeleteCall[] = [];
  const client = {
    from(table: string) {
      return {
        delete() {
          return {
            in(_col: string, statuses: string[]) {
              return {
                lt(cutoffColumn: string, cutoff: string) {
                  return {
                    select() {
                      calls.push({ table, statuses, cutoffColumn, cutoff });
                      return Promise.resolve(resultsByTable[table] ?? { data: [], error: null });
                    },
                  };
                },
              };
            },
          };
        },
      };
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any as SupabaseClient;
  return { client, calls };
}

describe("purgeOldRecords", () => {
  it("deletes only terminal-status outbox_jobs older than the retention window", async () => {
    const { client, calls } = makeClient({
      outbox_jobs: { data: [{ id: "a" }, { id: "b" }], error: null },
      notification_deliveries: { data: [], error: null },
    });

    const now = new Date("2026-06-01T00:00:00.000Z");
    const result = await purgeOldRecords(client, now, 30, 365);

    const outboxCall = calls.find((c) => c.table === "outbox_jobs");
    expect(outboxCall?.statuses).toEqual(["succeeded", "dead_letter"]);
    expect(outboxCall?.cutoff).toBe(new Date("2026-05-02T00:00:00.000Z").toISOString());
    expect(result.outboxJobsDeleted).toBe(2);
  });

  it("deletes only terminal-status notification_deliveries older than the retention window", async () => {
    const { client, calls } = makeClient({
      outbox_jobs: { data: [], error: null },
      notification_deliveries: { data: [{ id: "x" }], error: null },
    });

    const now = new Date("2026-06-01T00:00:00.000Z");
    const result = await purgeOldRecords(client, now, 30, 365);

    const notificationCall = calls.find((c) => c.table === "notification_deliveries");
    expect(notificationCall?.statuses).toEqual(["sent", "failed", "cancelled"]);
    expect(notificationCall?.cutoff).toBe(new Date("2025-06-01T00:00:00.000Z").toISOString());
    expect(result.notificationDeliveriesDeleted).toBe(1);
  });

  it("throws when the outbox_jobs delete fails", async () => {
    const client = {
      from(table: string) {
        return {
          delete: () => ({
            in: () => ({
              lt: () => ({
                select: () =>
                  Promise.resolve(
                    table === "outbox_jobs"
                      ? { data: null, error: { message: "boom" } }
                      : { data: [], error: null },
                  ),
              }),
            }),
          }),
        };
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any as SupabaseClient;

    await expect(purgeOldRecords(client)).rejects.toThrow(/boom/);
  });

  it("never touches non-terminal statuses (scheduled outbox pending/processing/failed, scheduled deliveries)", async () => {
    const { client, calls } = makeClient({
      outbox_jobs: { data: [], error: null },
      notification_deliveries: { data: [], error: null },
    });

    await purgeOldRecords(client);

    for (const call of calls) {
      expect(call.statuses).not.toContain("pending");
      expect(call.statuses).not.toContain("processing");
      expect(call.statuses).not.toContain("scheduled");
    }
  });
});
