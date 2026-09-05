import { describe, expect, it } from "vitest";
import {
  createDeterministicDemoGenerator,
  generateMessagesResultSchema,
  isRateLimited,
  selectMessageFacts,
  type MessageGenerationContext,
} from "../messages";

function makeContext(overrides: Partial<MessageGenerationContext> = {}): MessageGenerationContext {
  return {
    recipientDisplayName: "Amara",
    relationshipType: "friend",
    occasion: "Birthday",
    tone: "thoughtful",
    channel: "whatsapp",
    facts: [],
    ...overrides,
  };
}

describe("createDeterministicDemoGenerator", () => {
  const generator = createDeterministicDemoGenerator();

  it("returns exactly three meaningfully different options", async () => {
    const result = await generator.generateMessages(makeContext());
    expect(result.success).toBe(true);
    if (!result.success) throw new Error("expected success");

    expect(generateMessagesResultSchema.safeParse(result).success).toBe(true);
    expect(result.options).toHaveLength(3);
    const contents = result.options.map((o) => o.content);
    expect(new Set(contents).size).toBe(3);
    const labels = result.options.map((o) => o.label);
    expect(new Set(labels).size).toBe(3);
  });

  it("is clearly labelled as the demo provider, not disguised as live AI", async () => {
    const result = await generator.generateMessages(makeContext());
    if (!result.success) throw new Error("expected success");
    expect(result.provider).toBe("demo");
    expect(result.modelMetadata).toMatchObject({ demo: true });
  });

  it("only ever mentions facts explicitly passed in, never invents one", async () => {
    const withFact = await generator.generateMessages(
      makeContext({ facts: [{ content: "just adopted a puppy", category: "general" }] }),
    );
    const withoutFact = await generator.generateMessages(makeContext({ facts: [] }));
    if (!withFact.success || !withoutFact.success) throw new Error("expected success");

    expect(withFact.options.some((o) => o.content.includes("just adopted a puppy"))).toBe(true);
    expect(withoutFact.options.some((o) => o.content.includes("just adopted a puppy"))).toBe(
      false,
    );
    // No option ever states an age — the generator has no age input at all.
    for (const o of [...withFact.options, ...withoutFact.options]) {
      expect(o.content).not.toMatch(/turning \d+/i);
    }
  });

  it("includes a custom instruction verbatim when provided", async () => {
    const result = await generator.generateMessages(
      makeContext({ customInstruction: "Mention our trip to Lagos" }),
    );
    if (!result.success) throw new Error("expected success");
    expect(result.options.every((o) => o.content.includes("Mention our trip to Lagos"))).toBe(
      true,
    );
  });

  it("respects the channel's length ceiling (sms shorter than email)", async () => {
    const longFact = { content: "x".repeat(500), category: "general" as const };
    const sms = await generator.generateMessages(
      makeContext({ channel: "sms", facts: [longFact] }),
    );
    if (!sms.success) throw new Error("expected success");
    for (const o of sms.options) {
      expect(o.content.length).toBeLessThanOrEqual(300);
    }
  });

  it("varies wording by tone while keeping the same structure count", async () => {
    const thoughtful = await generator.generateMessages(makeContext({ tone: "thoughtful" }));
    const funny = await generator.generateMessages(makeContext({ tone: "funny" }));
    if (!thoughtful.success || !funny.success) throw new Error("expected success");
    expect(thoughtful.options[0]?.content).not.toBe(funny.options[0]?.content);
  });
});

describe("selectMessageFacts", () => {
  const memories = [
    { id: "m1", content: "loves hiking", category: "interest" as const },
    { id: "m2", content: "recently divorced", category: "family" as const },
  ];

  it("includes only memories whose id is in the current request's selection", () => {
    expect(selectMessageFacts(memories, ["m1"])).toEqual([
      { content: "loves hiking", category: "interest" },
    ]);
  });

  it("excludes everything when nothing is selected this request — no persisted default", () => {
    expect(selectMessageFacts(memories, [])).toEqual([]);
  });

  it("includes a sensitive-categorised memory when explicitly selected for this request", () => {
    expect(selectMessageFacts(memories, ["m2"])).toEqual([
      { content: "recently divorced", category: "family" },
    ]);
  });
});

describe("isRateLimited", () => {
  const now = new Date("2026-09-05T12:00:00Z");
  const windowMs = 60 * 60 * 1000;

  it("is not limited below the max", () => {
    const timestamps = [new Date("2026-09-05T11:50:00Z"), new Date("2026-09-05T11:55:00Z")];
    expect(isRateLimited(timestamps, now, 5, windowMs)).toBe(false);
  });

  it("is limited once the max within the window is reached", () => {
    const timestamps = Array.from({ length: 5 }, (_, i) => new Date(now.getTime() - i * 1000));
    expect(isRateLimited(timestamps, now, 5, windowMs)).toBe(true);
  });

  it("ignores timestamps outside the window", () => {
    const timestamps = Array.from({ length: 5 }, () => new Date(now.getTime() - windowMs - 1000));
    expect(isRateLimited(timestamps, now, 5, windowMs)).toBe(false);
  });
});
