import { describe, expect, it, vi } from "vitest";
import type { EmailProvider, WebPushProvider } from "@noyala/domain";
import { processReminderJob } from "../process-reminder-job";

/**
 * A minimal fake Supabase client. Each table gets a canned response for
 * `.select(...).eq(...).maybeSingle()/.single()` and captures
 * `.update(...).eq(...)` / `.delete(...).eq(...)` calls. Good enough for
 * this function's straight-line query sequence without pulling in a real
 * Postgres — the SQL/RLS side is verified live (docs/stage-reports).
 */
function makeClient(options: {
  delivery?: Record<string, unknown> | null;
  importantDate?: Record<string, unknown>;
  person?: Record<string, unknown>;
  authUser?: { email: string | null } | null;
  pushSubscriptions?: Record<string, unknown>[];
  updateSpy?: ReturnType<typeof vi.fn>;
  deleteSpy?: ReturnType<typeof vi.fn>;
}) {
  const updateSpy = options.updateSpy ?? vi.fn();
  const deleteSpy = options.deleteSpy ?? vi.fn();

  const single = (data: unknown) => ({
    single: () => Promise.resolve({ data, error: null }),
    maybeSingle: () => Promise.resolve({ data, error: null }),
  });

  const tableSelect: Record<string, unknown> = {
    notification_deliveries: single(options.delivery ?? null),
    important_dates: single(options.importantDate ?? {}),
    people: single(options.person ?? {}),
    push_subscriptions: {
      // list query, no .single()
      then: (resolve: (value: { data: unknown; error: null }) => void) =>
        resolve({ data: options.pushSubscriptions ?? [], error: null }),
    },
  };

  return {
    from(table: string) {
      return {
        select: () => ({
          eq: () => tableSelect[table],
        }),
        update: (values: unknown) => ({
          eq: (col: string, val: unknown) => {
            updateSpy(table, values, { [col]: val });
            return Promise.resolve({ error: null });
          },
        }),
        delete: () => ({
          eq: (col: string, val: unknown) => {
            deleteSpy(table, { [col]: val });
            return Promise.resolve({ error: null });
          },
        }),
      };
    },
    auth: {
      admin: {
        getUserById: () =>
          Promise.resolve({
            data: { user: options.authUser },
            error: options.authUser ? null : { message: "not found" },
          }),
      },
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

const emailProvider: EmailProvider = { sendEmail: vi.fn() };
const pushProvider: WebPushProvider = { sendPush: vi.fn() };

describe("processReminderJob", () => {
  it("no-ops when the notification_delivery row doesn't exist", async () => {
    const client = makeClient({ delivery: null });
    await expect(
      processReminderJob(client, emailProvider, pushProvider, { deduplicationKey: "x" }),
    ).resolves.toBeUndefined();
  });

  it("no-ops when the delivery is no longer 'scheduled' (idempotent re-run)", async () => {
    const sendEmail = vi.fn();
    const client = makeClient({ delivery: { id: "d1", status: "cancelled", channel: "email" } });
    await processReminderJob(client, { sendEmail } as unknown as EmailProvider, pushProvider, {
      deduplicationKey: "x",
    });
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("sends email and marks the delivery sent on success", async () => {
    const updateSpy = vi.fn();
    const sendEmail = vi.fn().mockResolvedValue({ delivered: true, provider: "console" });
    const client = makeClient({
      delivery: { id: "d1", user_id: "u1", important_date_id: "date1", channel: "email", status: "scheduled" },
      importantDate: { label: "Birthday", person_id: "p1" },
      person: { first_name: "Amara" },
      authUser: { email: "user@example.com" },
      updateSpy,
    });

    await processReminderJob(client, { sendEmail } as unknown as EmailProvider, pushProvider, {
      deduplicationKey: "x",
    });

    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "user@example.com" }),
    );
    expect(updateSpy).toHaveBeenCalledWith(
      "notification_deliveries",
      { status: "sent", last_error: null },
      { id: "d1" },
    );
  });

  it("marks the delivery failed (no retry) when the user has no email on file", async () => {
    const updateSpy = vi.fn();
    const sendEmail = vi.fn();
    const client = makeClient({
      delivery: { id: "d1", user_id: "u1", important_date_id: "date1", channel: "email", status: "scheduled" },
      importantDate: { label: "Birthday", person_id: "p1" },
      person: { first_name: "Amara" },
      authUser: null,
      updateSpy,
    });

    await processReminderJob(client, { sendEmail } as unknown as EmailProvider, pushProvider, {
      deduplicationKey: "x",
    });

    expect(sendEmail).not.toHaveBeenCalled();
    expect(updateSpy).toHaveBeenCalledWith(
      "notification_deliveries",
      expect.objectContaining({ status: "failed" }),
      { id: "d1" },
    );
  });

  it("throws (for the outbox to retry) on a transient email failure", async () => {
    const sendEmail = vi.fn().mockResolvedValue({ delivered: false, provider: "resend", permanentFailure: false });
    const client = makeClient({
      delivery: { id: "d1", user_id: "u1", important_date_id: "date1", channel: "email", status: "scheduled" },
      importantDate: { label: "Birthday", person_id: "p1" },
      person: { first_name: "Amara" },
      authUser: { email: "user@example.com" },
    });

    await expect(
      processReminderJob(client, { sendEmail } as unknown as EmailProvider, pushProvider, {
        deduplicationKey: "x",
      }),
    ).rejects.toThrow();
  });

  it("marks failed (no retry) when there are no push subscriptions", async () => {
    const updateSpy = vi.fn();
    const client = makeClient({
      delivery: { id: "d1", user_id: "u1", important_date_id: "date1", channel: "push", status: "scheduled" },
      importantDate: { label: "Birthday", person_id: "p1" },
      person: { first_name: "Amara" },
      pushSubscriptions: [],
      updateSpy,
    });

    await processReminderJob(client, emailProvider, pushProvider, { deduplicationKey: "x" });

    expect(updateSpy).toHaveBeenCalledWith(
      "notification_deliveries",
      expect.objectContaining({ status: "failed" }),
      { id: "d1" },
    );
  });

  it("deletes an expired push subscription and marks sent if another one succeeds", async () => {
    const updateSpy = vi.fn();
    const deleteSpy = vi.fn();
    const sendPush = vi
      .fn()
      .mockResolvedValueOnce({ delivered: false, provider: "web-push", permanentFailure: true })
      .mockResolvedValueOnce({ delivered: true, provider: "web-push" });

    const client = makeClient({
      delivery: { id: "d1", user_id: "u1", important_date_id: "date1", channel: "push", status: "scheduled" },
      importantDate: { label: "Birthday", person_id: "p1" },
      person: { first_name: "Amara" },
      pushSubscriptions: [
        { endpoint: "gone", p256dh: "a", auth: "b" },
        { endpoint: "alive", p256dh: "c", auth: "d" },
      ],
      updateSpy,
      deleteSpy,
    });

    await processReminderJob(client, emailProvider, { sendPush } as unknown as WebPushProvider, {
      deduplicationKey: "x",
    });

    expect(deleteSpy).toHaveBeenCalledWith("push_subscriptions", { endpoint: "gone" });
    expect(updateSpy).toHaveBeenCalledWith(
      "notification_deliveries",
      expect.objectContaining({ status: "sent" }),
      { id: "d1" },
    );
  });
});
