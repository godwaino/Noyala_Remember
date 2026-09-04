import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createPostgresOutboxStore } from "../postgres-outbox";

type Handlers = {
  upsert?: (table: string, values: unknown, opts: unknown) => { error: unknown };
  selectSingle?: (
    table: string,
    filter: Record<string, unknown>,
  ) => { data: unknown; error: unknown };
  update?: (
    table: string,
    values: unknown,
    filter: Record<string, unknown>,
  ) => { error: unknown };
  rpc?: (fn: string, args: unknown) => { data: unknown; error: unknown };
};

function makeClient(handlers: Handlers): SupabaseClient {
  return {
    from(table: string) {
      return {
        upsert(values: unknown, opts: unknown) {
          return Promise.resolve(
            handlers.upsert?.(table, values, opts) ?? { error: null },
          );
        },
        select() {
          return {
            eq(col: string, val: unknown) {
              return {
                single() {
                  return Promise.resolve(
                    handlers.selectSingle?.(table, { [col]: val }) ?? {
                      data: null,
                      error: null,
                    },
                  );
                },
              };
            },
          };
        },
        update(values: unknown) {
          return {
            eq(col: string, val: unknown) {
              return Promise.resolve(
                handlers.update?.(table, values, { [col]: val }) ?? { error: null },
              );
            },
          };
        },
      };
    },
    rpc(fn: string, args: unknown) {
      return Promise.resolve(handlers.rpc?.(fn, args) ?? { data: null, error: null });
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

const nowRow = {
  id: "job-1",
  type: "reminder.deliver",
  payload: { foo: "bar" },
  deduplication_key: "dedup-1",
  status: "pending",
  attempt_count: 0,
  max_attempts: 5,
  available_at: "2026-01-01T00:00:00.000Z",
  last_error: null,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

describe("createPostgresOutboxStore", () => {
  it("enqueue upserts on the deduplication key and returns the stored job", async () => {
    const upsert = vi.fn().mockReturnValue({ error: null });
    const client = makeClient({
      upsert,
      selectSingle: () => ({ data: nowRow, error: null }),
    });

    const store = createPostgresOutboxStore(client);
    const job = await store.enqueue({
      type: "reminder.deliver",
      payload: { foo: "bar" },
      deduplicationKey: "dedup-1",
    });

    expect(upsert).toHaveBeenCalledWith(
      "outbox_jobs",
      expect.objectContaining({ deduplication_key: "dedup-1" }),
      expect.objectContaining({ onConflict: "deduplication_key", ignoreDuplicates: true }),
    );
    expect(job.id).toBe("job-1");
    expect(job.status).toBe("pending");
  });

  it("enqueue throws when the upsert fails", async () => {
    const client = makeClient({
      upsert: () => ({ error: { message: "boom" } }),
    });
    const store = createPostgresOutboxStore(client);

    await expect(
      store.enqueue({ type: "x", payload: {}, deduplicationKey: "d" }),
    ).rejects.toThrow(/boom/);
  });

  it("claimNext calls the atomic claim RPC and maps the result", async () => {
    const rpc = vi.fn().mockReturnValue({ data: [nowRow], error: null });
    const client = makeClient({ rpc });
    const store = createPostgresOutboxStore(client);

    const job = await store.claimNext("reminder.deliver");

    expect(rpc).toHaveBeenCalledWith(
      "claim_outbox_job",
      expect.objectContaining({ job_type: "reminder.deliver" }),
    );
    expect(job?.id).toBe("job-1");
  });

  it("claimNext returns null when nothing is claimable", async () => {
    const client = makeClient({ rpc: () => ({ data: [], error: null }) });
    const store = createPostgresOutboxStore(client);

    expect(await store.claimNext("reminder.deliver")).toBeNull();
  });

  it("markFailed retries (status=failed) when attempts remain", async () => {
    const update = vi.fn().mockReturnValue({ error: null });
    const client = makeClient({
      selectSingle: () => ({ data: { attempt_count: 1, max_attempts: 5 }, error: null }),
      update,
    });
    const store = createPostgresOutboxStore(client);

    await store.markFailed("job-1", "temporary error", 5_000);

    expect(update).toHaveBeenCalledWith(
      "outbox_jobs",
      expect.objectContaining({ status: "failed", last_error: "temporary error" }),
      { id: "job-1" },
    );
  });

  it("markFailed dead-letters once attempts are exhausted", async () => {
    const update = vi.fn().mockReturnValue({ error: null });
    const client = makeClient({
      selectSingle: () => ({ data: { attempt_count: 5, max_attempts: 5 }, error: null }),
      update,
    });
    const store = createPostgresOutboxStore(client);

    await store.markFailed("job-1", "final error", 5_000);

    expect(update).toHaveBeenCalledWith(
      "outbox_jobs",
      expect.objectContaining({ status: "dead_letter" }),
      { id: "job-1" },
    );
  });

  it("markSucceeded sets status=succeeded", async () => {
    const update = vi.fn().mockReturnValue({ error: null });
    const client = makeClient({ update });
    const store = createPostgresOutboxStore(client);

    await store.markSucceeded("job-1");

    expect(update).toHaveBeenCalledWith("outbox_jobs", { status: "succeeded" }, { id: "job-1" });
  });
});
