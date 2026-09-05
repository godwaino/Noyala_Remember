import { describe, expect, it } from "vitest";
import { findLikelyDuplicateGiftIdeas, type GiftIdeaSummary } from "../gift-planning";

const existing: GiftIdeaSummary[] = [
  { id: "1", title: "Lego set", status: "idea" },
  { id: "2", title: "Cookbook", status: "given" },
  { id: "3", title: "Wireless headphones", status: "planned" },
];

describe("findLikelyDuplicateGiftIdeas", () => {
  it("flags an exact normalized match", () => {
    const matches = findLikelyDuplicateGiftIdeas("lego set!", existing);
    expect(matches.map((m) => m.id)).toEqual(["1"]);
  });

  it("flags a superset title (word-subset match)", () => {
    const matches = findLikelyDuplicateGiftIdeas("Lego Star Wars set", existing);
    expect(matches.map((m) => m.id)).toEqual(["1"]);
  });

  it("flags a subset title in the other direction", () => {
    const matches = findLikelyDuplicateGiftIdeas("headphones", existing);
    expect(matches.map((m) => m.id)).toEqual(["3"]);
  });

  it("includes already-given ideas, not just live ones", () => {
    const matches = findLikelyDuplicateGiftIdeas("cookbook", existing);
    expect(matches.map((m) => m.id)).toEqual(["2"]);
  });

  it("excludes the row being edited", () => {
    const matches = findLikelyDuplicateGiftIdeas("lego set", existing, "1");
    expect(matches).toEqual([]);
  });

  it("finds nothing for an unrelated title", () => {
    const matches = findLikelyDuplicateGiftIdeas("Gift card", existing);
    expect(matches).toEqual([]);
  });

  it("returns nothing for an empty title", () => {
    expect(findLikelyDuplicateGiftIdeas("   ", existing)).toEqual([]);
  });
});
