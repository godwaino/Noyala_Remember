import { describe, expect, it } from "vitest";
import {
  createDeterministicTranscriptionProvider,
  enqueueOfflineCapture,
  extractFactCandidates,
  markOfflineCaptureFailed,
  markOfflineCaptureUploaded,
  markOfflineCaptureUploading,
  nextOfflineCaptureToUpload,
  type OfflineCaptureItem,
} from "../voice-capture";

describe("createDeterministicTranscriptionProvider", () => {
  it("clearly labels its output as a demo, never disguised as real transcription", async () => {
    const provider = createDeterministicTranscriptionProvider();
    const result = await provider.transcribe({ storagePath: "a/b.m4a", durationSeconds: 12 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.provider).toBe("demo");
      expect(result.transcript).toMatch(/demo/i);
      expect(result.transcript).toContain("12s");
    }
  });
});

describe("extractFactCandidates", () => {
  it("splits a transcript into one candidate per sentence", () => {
    const candidates = extractFactCandidates("Loves hiking. Allergic to peanuts! Works in finance?");
    expect(candidates).toEqual([
      { content: "Loves hiking.", category: "general" },
      { content: "Allergic to peanuts!", category: "general" },
      { content: "Works in finance?", category: "general" },
    ]);
  });

  it("caps the number of candidates", () => {
    const transcript = "One. Two. Three. Four. Five. Six.";
    expect(extractFactCandidates(transcript, 2)).toHaveLength(2);
  });

  it("returns nothing for an empty transcript", () => {
    expect(extractFactCandidates("   ")).toEqual([]);
  });
});

const baseItem: OfflineCaptureItem = {
  localId: "a",
  localFileUri: "file://a.m4a",
  durationSeconds: 5,
  personId: null,
  status: "queued",
  attemptCount: 0,
  lastError: null,
  createdAt: "2026-01-01T00:00:00.000Z",
};

describe("enqueueOfflineCapture", () => {
  it("starts a new item as queued with zero attempts", () => {
    const item = enqueueOfflineCapture({
      localId: "a",
      localFileUri: "file://a.m4a",
      durationSeconds: 5,
      personId: null,
      now: new Date("2026-01-01T00:00:00.000Z"),
    });
    expect(item).toEqual(baseItem);
  });
});

describe("nextOfflineCaptureToUpload", () => {
  it("picks the oldest queued item", () => {
    const older = { ...baseItem, localId: "older", createdAt: "2026-01-01T00:00:00.000Z" };
    const newer = { ...baseItem, localId: "newer", createdAt: "2026-01-02T00:00:00.000Z" };
    expect(nextOfflineCaptureToUpload([newer, older])?.localId).toBe("older");
  });

  it("never starts a second upload while one is already uploading", () => {
    const uploading = { ...baseItem, localId: "in-flight", status: "uploading" as const };
    const queued = { ...baseItem, localId: "waiting" };
    expect(nextOfflineCaptureToUpload([uploading, queued])).toBeNull();
  });

  it("returns null when nothing is queued", () => {
    expect(nextOfflineCaptureToUpload([])).toBeNull();
  });
});

describe("offline capture status transitions", () => {
  it("moves queued -> uploading -> uploaded on success", () => {
    const uploading = markOfflineCaptureUploading(baseItem);
    expect(uploading.status).toBe("uploading");
    expect(uploading.attemptCount).toBe(1);

    const uploaded = markOfflineCaptureUploaded(uploading);
    expect(uploaded.status).toBe("uploaded");
    expect(uploaded.lastError).toBeNull();
  });

  it("retries a failed upload until maxAttempts, then gives up", () => {
    let item = markOfflineCaptureUploading(baseItem); // attemptCount 1
    item = markOfflineCaptureFailed(item, "network error", 3);
    expect(item.status).toBe("queued");

    item = markOfflineCaptureUploading(item); // attemptCount 2
    item = markOfflineCaptureFailed(item, "network error", 3);
    expect(item.status).toBe("queued");

    item = markOfflineCaptureUploading(item); // attemptCount 3
    item = markOfflineCaptureFailed(item, "network error", 3);
    expect(item.status).toBe("failed");
  });
});
