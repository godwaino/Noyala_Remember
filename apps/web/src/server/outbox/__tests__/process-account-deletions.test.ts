import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { processAccountDeletions } from "../process-account-deletions";

function makeClient(opts: {
  due: { user_id: string }[];
  listError?: unknown;
  deleteResults?: Record<string, { error: unknown } | undefined>;
}) {
  const deleteUser = vi.fn(async (userId: string) => {
    const result = opts.deleteResults?.[userId];
    return { error: result?.error ?? null };
  });

  const client = {
    from(table: string) {
      expect(table).toBe("account_deletion_requests");
      return {
        select() {
          return {
            eq() {
              return {
                lte() {
                  return Promise.resolve(
                    opts.listError
                      ? { data: null, error: opts.listError }
                      : { data: opts.due, error: null },
                  );
                },
              };
            },
          };
        },
      };
    },
    auth: {
      admin: { deleteUser },
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any as SupabaseClient;

  return { client, deleteUser };
}

describe("processAccountDeletions", () => {
  it("erases every pending request whose erase_after has passed", async () => {
    const { client, deleteUser } = makeClient({
      due: [{ user_id: "user-a" }, { user_id: "user-b" }],
    });

    const result = await processAccountDeletions(client, new Date("2026-06-01T00:00:00.000Z"));

    expect(deleteUser).toHaveBeenCalledWith("user-a");
    expect(deleteUser).toHaveBeenCalledWith("user-b");
    expect(result).toEqual({ erased: 2, failed: 0 });
  });

  it("does nothing when no request is due", async () => {
    const { client, deleteUser } = makeClient({ due: [] });

    const result = await processAccountDeletions(client);

    expect(deleteUser).not.toHaveBeenCalled();
    expect(result).toEqual({ erased: 0, failed: 0 });
  });

  it("counts a failed deletion separately and still processes the rest", async () => {
    const { client } = makeClient({
      due: [{ user_id: "user-a" }, { user_id: "user-b" }],
      deleteResults: { "user-a": { error: new Error("admin API unavailable") } },
    });

    const result = await processAccountDeletions(client);

    expect(result).toEqual({ erased: 1, failed: 1 });
  });

  it("throws if listing due requests fails, rather than silently processing nothing", async () => {
    const { client } = makeClient({ due: [], listError: new Error("connection reset") });

    await expect(processAccountDeletions(client)).rejects.toThrow(
      "Failed to list due account deletions: connection reset",
    );
  });
});
