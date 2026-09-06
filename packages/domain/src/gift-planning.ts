import type { GiftIdeaStatus } from "./types";

export interface GiftIdeaSummary {
  id: string;
  title: string;
  status: GiftIdeaStatus;
}

/**
 * Flags existing gift ideas for the same person that look like the same
 * gift, so the UI can warn before someone plans a duplicate (Master Build
 * Prompt §6/§12: "duplicate-gift warnings"). Deliberately simple — exact
 * match or word-subset match on normalized titles — rather than a
 * fuzzy-matching dependency: good enough to catch "Lego set" vs "lego
 * set!" or "Lego set" vs "Lego Star Wars set", not a spellchecker. False
 * positives are fine since this only produces a warning, never a block.
 *
 * Every status is checked, including 'given': re-planning something
 * already given in the past is still worth surfacing.
 */
export function findLikelyDuplicateGiftIdeas(
  candidateTitle: string,
  existingIdeas: GiftIdeaSummary[],
  excludeId?: string
): GiftIdeaSummary[] {
  const candidateWords = normalizeGiftTitleWords(candidateTitle);
  if (candidateWords.size === 0) return [];

  return existingIdeas.filter((idea) => {
    if (idea.id === excludeId) return false;
    const ideaWords = normalizeGiftTitleWords(idea.title);
    if (ideaWords.size === 0) return false;
    return isWordSubset(candidateWords, ideaWords) || isWordSubset(ideaWords, candidateWords);
  });
}

function normalizeGiftTitleWords(title: string): Set<string> {
  const normalized = title
    .toLowerCase()
    .trim()
    .replace(/[.,!?'"()]/g, "")
    .replace(/\s+/g, " ");
  return new Set(normalized.split(" ").filter(Boolean));
}

function isWordSubset(smaller: Set<string>, larger: Set<string>): boolean {
  if (smaller.size === 0) return false;
  for (const word of smaller) {
    if (!larger.has(word)) return false;
  }
  return true;
}

/**
 * A gift idea's `linkUrl` is rendered as a live `<a href>` for every circle
 * member sharing gift planning on that person, not just the person who
 * entered it — a `javascript:`/`vbscript:` value would be a stored-XSS
 * vector across users. Used both by `giftIdeaInputSchema`'s validation and
 * again here at render time, so a row written before that validation
 * existed (or by any future direct-write path) still can't reach the DOM
 * as a live link.
 */
export function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}
