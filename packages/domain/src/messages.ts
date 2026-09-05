import { z } from "zod";
import type { MemoryCategory, MessageChannel, MessageTone, RelationshipType } from "./types";

/**
 * Provider-independent contracts for AI message generation, mirroring the
 * adapter pattern in notifications.ts. Concrete implementations (the
 * deterministic demo generator, a real AI provider) live in
 * apps/web/src/server/ai — this file only defines the shape and the
 * framework-free logic that doesn't need a network call, so it's testable
 * without any provider at all.
 */

export interface MessageFact {
  content: string;
  category: MemoryCategory;
}

/**
 * Exactly what an AIMessageProvider is allowed to see — matches Master
 * Build Prompt §8's input allowlist. No memory ids, no raw timestamps, no
 * user id: only what's needed to write the message, so a provider
 * implementation can never accidentally leak more than this shape permits.
 */
export interface MessageGenerationContext {
  recipientDisplayName: string;
  relationshipType?: RelationshipType;
  occasion: string;
  tone: MessageTone;
  channel: MessageChannel;
  /** Facts the user explicitly selected for this generation request only —
   * never a saved "always include" preference. Treated as untrusted data by
   * any real provider implementation, never as instructions. */
  facts: MessageFact[];
  /** Previous message bodies, included only to reduce repetition. */
  previousMessageSnippets?: string[];
  customInstruction?: string;
}

export const messageOptionSchema = z.object({
  label: z.string().trim().min(1).max(80),
  content: z.string().trim().min(1),
});

export type MessageOption = z.infer<typeof messageOptionSchema>;

export const generateMessagesResultSchema = z.object({
  options: z.array(messageOptionSchema).length(3),
});

export interface GenerateMessagesSuccess {
  success: true;
  options: MessageOption[];
  provider: string;
  modelMetadata?: Record<string, unknown>;
}

export interface GenerateMessagesFailure {
  success: false;
  provider: string;
  reason: "timeout" | "invalid_schema" | "provider_error" | "rate_limited";
  message: string;
}

export type GenerateMessagesOutcome = GenerateMessagesSuccess | GenerateMessagesFailure;

export interface AIMessageProvider {
  generateMessages(context: MessageGenerationContext): Promise<GenerateMessagesOutcome>;
}

const CHANNEL_MAX_LENGTH: Record<MessageChannel, number> = {
  sms: 300,
  whatsapp: 1000,
  email: 2000,
};

function trimForChannel(content: string, channel: MessageChannel): string {
  const max = CHANNEL_MAX_LENGTH[channel];
  if (content.length <= max) return content;
  return `${content.slice(0, max - 1).trimEnd()}…`;
}

interface ToneVoice {
  opener: string;
  closer: string;
  adjective: string;
}

const TONE_VOICE: Record<MessageTone, ToneVoice> = {
  short_and_warm: { opener: "Hey", closer: "Sending you warmth today", adjective: "wonderful" },
  thoughtful: {
    opener: "I've been thinking about you",
    closer: "Wishing you all the best",
    adjective: "meaningful",
  },
  funny: {
    opener: "Alert: it's your big day",
    closer: "Don't let it go to your head",
    adjective: "hilarious",
  },
  professional: {
    opener: "Wishing you well",
    closer: "Best regards",
    adjective: "well-deserved",
  },
  faith_based: {
    opener: "Praying for you today",
    closer: "Blessings to you",
    adjective: "blessed",
  },
  custom: { opener: "Hi", closer: "Take care", adjective: "special" },
};

function factsClause(facts: MessageFact[]): string {
  if (facts.length === 0) return "";
  const list = facts
    .slice(0, 2)
    .map((f) => f.content)
    .join(" and ");
  return ` — ${list}`;
}

/**
 * Three structurally distinct templates (not just tone-word swaps) so the
 * options are "meaningfully different" per Master Build Prompt §8, while
 * only ever using facts the caller passed in — it has no way to invent a
 * detail (an age, a date) that wasn't already handed to it as a fact.
 */
function buildDemoOptions(context: MessageGenerationContext): MessageOption[] {
  const { recipientDisplayName: name, occasion, customInstruction } = context;
  const voice = TONE_VOICE[context.tone];
  const clause = factsClause(context.facts);
  const ps = customInstruction ? ` P.S. ${customInstruction}` : "";

  const drafts: MessageOption[] = [
    {
      label: "Classic",
      content: `${voice.opener} ${name}! Happy ${occasion}${clause}. ${voice.closer}.${ps}`,
    },
    {
      label: "Playful",
      content: `${name}, ${occasion} calls for celebration${clause}! ${voice.closer}!${ps}`,
    },
    {
      label: "Heartfelt",
      content: `On this ${voice.adjective} ${occasion}, ${name}, I wanted to say ${voice.closer.toLowerCase()}${clause}.${ps}`,
    },
  ];

  return drafts.map((d) => ({ ...d, content: trimForChannel(d.content, context.channel) }));
}

/**
 * Master Build Prompt §8: "If no AI key is configured, provide a clearly
 * labelled deterministic demo generator so the full UI remains testable
 * locally. Do not disguise demo text as live AI output." The labelling
 * happens via `provider: "demo"` (surfaced in the UI as a banner) rather
 * than mangling the message text itself, which would make the demo output
 * useless as an actual message to send.
 */
export function createDeterministicDemoGenerator(): AIMessageProvider {
  return {
    async generateMessages(context) {
      return {
        success: true,
        options: buildDemoOptions(context),
        provider: "demo",
        modelMetadata: { demo: true },
      };
    },
  };
}

/**
 * Every generation is independent and stateless — there is no saved
 * "always include sensitive memories" preference anywhere in this schema —
 * so a memory only ever reaches a provider when its id is in `selectedIds`
 * on *this* request, satisfying Master Build Prompt §8's "visibly require
 * explicit inclusion for each generation request" by construction rather
 * than a special sensitivity check here.
 */
interface SelectableMemory {
  id: string;
  content: string;
  category: MemoryCategory;
}

export function selectMessageFacts(
  memories: SelectableMemory[],
  selectedIds: readonly string[],
): MessageFact[] {
  const selected = new Set(selectedIds);
  return memories
    .filter((m) => selected.has(m.id))
    .map((m) => ({ content: m.content, category: m.category }));
}

/** Pure so the rate-limit policy is unit-testable without a database. */
export function isRateLimited(
  recentGenerationTimestamps: readonly Date[],
  now: Date,
  maxPerWindow: number,
  windowMs: number,
): boolean {
  const cutoff = now.getTime() - windowMs;
  const count = recentGenerationTimestamps.filter((t) => t.getTime() > cutoff).length;
  return count >= maxPerWindow;
}
