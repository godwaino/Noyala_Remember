import { afterEach, describe, expect, it, vi } from "vitest";
import { createConsoleEmailProvider } from "../console-email-provider";
import { createResendEmailProvider } from "../resend-email-provider";
import { getEmailProvider } from "../email-provider";

describe("createConsoleEmailProvider", () => {
  it("always reports delivered via the console provider", async () => {
    const provider = createConsoleEmailProvider();
    const result = await provider.sendEmail({ to: "a@example.com", subject: "Hi", body: "x" });
    expect(result).toEqual({ delivered: true, provider: "console" });
  });
});

describe("createResendEmailProvider", () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("reports delivered on a 2xx response", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200 }) as typeof fetch;
    const provider = createResendEmailProvider("key", "noreply@noyala.test");
    const result = await provider.sendEmail({ to: "a@example.com", subject: "Hi", body: "x" });
    expect(result).toEqual({ delivered: true, provider: "resend" });
  });

  it("treats a 400 as a permanent failure (bad request, retrying won't help)", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue({ ok: false, status: 400, text: async () => "bad address" }) as typeof fetch;
    const provider = createResendEmailProvider("key", "noreply@noyala.test");
    const result = await provider.sendEmail({ to: "bad", subject: "Hi", body: "x" });
    expect(result).toEqual({ delivered: false, provider: "resend", permanentFailure: true });
  });

  it("treats a 429 (rate limit) as transient, not permanent", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue({ ok: false, status: 429, text: async () => "rate limited" }) as typeof fetch;
    const provider = createResendEmailProvider("key", "noreply@noyala.test");
    const result = await provider.sendEmail({ to: "a@example.com", subject: "Hi", body: "x" });
    expect(result.permanentFailure).toBe(false);
  });

  it("treats a 500 as transient", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue({ ok: false, status: 500, text: async () => "oops" }) as typeof fetch;
    const provider = createResendEmailProvider("key", "noreply@noyala.test");
    const result = await provider.sendEmail({ to: "a@example.com", subject: "Hi", body: "x" });
    expect(result.permanentFailure).toBe(false);
  });
});

describe("getEmailProvider", () => {
  const originalEnv = { ...process.env };
  const originalFetch = global.fetch;
  afterEach(() => {
    process.env = { ...originalEnv };
    global.fetch = originalFetch;
  });

  it("falls back to console when no API key/from-address is configured", async () => {
    delete process.env.EMAIL_PROVIDER_API_KEY;
    delete process.env.EMAIL_FROM_ADDRESS;
    const result = await getEmailProvider().sendEmail({ to: "a@example.com", subject: "Hi", body: "x" });
    expect(result.provider).toBe("console");
  });

  it("uses Resend once both are configured", async () => {
    process.env.EMAIL_PROVIDER_API_KEY = "key";
    process.env.EMAIL_FROM_ADDRESS = "noreply@noyala.test";
    global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200 }) as typeof fetch;
    const result = await getEmailProvider().sendEmail({ to: "a@example.com", subject: "Hi", body: "x" });
    expect(result.provider).toBe("resend");
  });
});
