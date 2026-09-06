import { NextRequest } from "next/server";
import { afterEach, describe, expect, it } from "vitest";
import { requireCronSecret } from "../require-cron-secret";

function requestWithAuth(header: string | null): NextRequest {
  const headers = new Headers();
  if (header !== null) headers.set("authorization", header);
  return new NextRequest("https://example.com/api/cron/discover-reminders", { headers });
}

describe("requireCronSecret", () => {
  const originalEnv = process.env.CRON_SECRET;
  afterEach(() => {
    process.env.CRON_SECRET = originalEnv;
  });

  it("returns null (authorized) when the bearer token matches CRON_SECRET", () => {
    process.env.CRON_SECRET = "the-real-secret";
    expect(requireCronSecret(requestWithAuth("Bearer the-real-secret"))).toBeNull();
  });

  it("401s when the header is missing", () => {
    process.env.CRON_SECRET = "the-real-secret";
    const response = requireCronSecret(requestWithAuth(null));
    expect(response?.status).toBe(401);
  });

  it("401s on a wrong secret of the same length", () => {
    process.env.CRON_SECRET = "the-real-secret";
    const response = requireCronSecret(requestWithAuth("Bearer the-fake-secret"));
    expect(response?.status).toBe(401);
  });

  it("401s on a wrong secret of a different length", () => {
    process.env.CRON_SECRET = "the-real-secret";
    const response = requireCronSecret(requestWithAuth("Bearer short"));
    expect(response?.status).toBe(401);
  });

  it("500s when CRON_SECRET isn't configured", () => {
    delete process.env.CRON_SECRET;
    const response = requireCronSecret(requestWithAuth("Bearer anything"));
    expect(response?.status).toBe(500);
  });
});
