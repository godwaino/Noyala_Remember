import { afterEach, describe, expect, it, vi } from "vitest";
import { logger } from "../logger";

function lastLoggedEntry(spy: ReturnType<typeof vi.spyOn>): Record<string, unknown> {
  const call = spy.mock.calls.at(-1);
  return JSON.parse(call?.[0] as string);
}

describe("logger", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("redacts a known PII field by name", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    logger.info("test", { content: "a private memory", personId: "abc" });
    const entry = lastLoggedEntry(spy);
    expect(entry.content).toBe("[redacted]");
    expect(entry.personId).toBe("abc");
  });

  it("scrubs an email address found inside an unrelated field, e.g. a provider error message", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    logger.error("Resend email send failed", {
      status: 400,
      errorBody: "Invalid recipient: someone@example.com is not a verified address",
    });
    const entry = lastLoggedEntry(spy);
    expect(entry.errorBody).not.toContain("someone@example.com");
    expect(entry.errorBody).toContain("[redacted-email]");
    expect(entry.status).toBe(400);
  });

  it("scrubs an email address inside a caught Error.message field", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    logger.error("Magic-link code exchange failed", {
      message: "No user found for jane.doe@example.com",
    });
    const entry = lastLoggedEntry(spy);
    expect(entry.message).toBe("No user found for [redacted-email]");
  });
});
