import { afterEach, describe, expect, it, vi } from "vitest";
import { createConsolePushProvider } from "../console-push-provider";
import { getPushProvider } from "../push-provider";

const subscription = {
  endpoint: "https://push.example.com/abc",
  keys: { p256dh: "p256dh-key", auth: "auth-key" },
};

vi.mock("web-push", () => ({
  default: {
    setVapidDetails: vi.fn(),
    sendNotification: vi.fn(),
  },
}));

describe("createConsolePushProvider", () => {
  it("always reports delivered via the console provider", async () => {
    const provider = createConsolePushProvider();
    const result = await provider.sendPush({ subscription, title: "Hi", body: "x" });
    expect(result).toEqual({ delivered: true, provider: "console" });
  });
});

describe("createWebPushProvider (via getPushProvider)", () => {
  const originalEnv = { ...process.env };
  afterEach(() => {
    process.env = { ...originalEnv };
    vi.clearAllMocks();
  });

  it("falls back to console when VAPID keys aren't configured", async () => {
    delete process.env.VAPID_PUBLIC_KEY;
    delete process.env.VAPID_PRIVATE_KEY;
    delete process.env.VAPID_SUBJECT;
    const result = await getPushProvider().sendPush({ subscription, title: "Hi", body: "x" });
    expect(result.provider).toBe("console");
  });

  it("reports delivered when web-push succeeds", async () => {
    process.env.VAPID_PUBLIC_KEY = "pub";
    process.env.VAPID_PRIVATE_KEY = "priv";
    process.env.VAPID_SUBJECT = "mailto:ops@noyala.test";
    const webpush = (await import("web-push")).default;
    vi.mocked(webpush.sendNotification).mockResolvedValue({} as never);

    const result = await getPushProvider().sendPush({ subscription, title: "Hi", body: "x" });
    expect(result).toEqual({ delivered: true, provider: "web-push" });
  });

  it("marks a 410 Gone as a permanent failure", async () => {
    process.env.VAPID_PUBLIC_KEY = "pub";
    process.env.VAPID_PRIVATE_KEY = "priv";
    process.env.VAPID_SUBJECT = "mailto:ops@noyala.test";
    const webpush = (await import("web-push")).default;
    vi.mocked(webpush.sendNotification).mockRejectedValue({ statusCode: 410 });

    const result = await getPushProvider().sendPush({ subscription, title: "Hi", body: "x" });
    expect(result).toEqual({ delivered: false, provider: "web-push", permanentFailure: true });
  });

  it("treats a 500 from the push service as transient", async () => {
    process.env.VAPID_PUBLIC_KEY = "pub";
    process.env.VAPID_PRIVATE_KEY = "priv";
    process.env.VAPID_SUBJECT = "mailto:ops@noyala.test";
    const webpush = (await import("web-push")).default;
    vi.mocked(webpush.sendNotification).mockRejectedValue({ statusCode: 500 });

    const result = await getPushProvider().sendPush({ subscription, title: "Hi", body: "x" });
    expect(result.permanentFailure).toBe(false);
  });
});
