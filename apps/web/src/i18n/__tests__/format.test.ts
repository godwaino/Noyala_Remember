import { describe, expect, it } from "vitest";
import { DEFAULT_LOCALE, formatDate, formatDateTime } from "../format";

describe("formatDate", () => {
  it("formats a Date using the default locale", () => {
    const result = formatDate(new Date(Date.UTC(2026, 5, 15)));
    expect(result).toBe(new Date(Date.UTC(2026, 5, 15)).toLocaleDateString(DEFAULT_LOCALE));
  });

  it("accepts an ISO string the same way it accepts a Date", () => {
    const iso = "2026-06-15T00:00:00.000Z";
    expect(formatDate(iso)).toBe(formatDate(new Date(iso)));
  });

  it("respects an explicit locale override", () => {
    const date = new Date(Date.UTC(2026, 5, 15));
    expect(formatDate(date, "en-GB")).toBe(date.toLocaleDateString("en-GB"));
  });
});

describe("formatDateTime", () => {
  it("formats a Date using the default locale", () => {
    const date = new Date(Date.UTC(2026, 5, 15, 12, 30));
    expect(formatDateTime(date)).toBe(date.toLocaleString(DEFAULT_LOCALE));
  });

  it("accepts an ISO string the same way it accepts a Date", () => {
    const iso = "2026-06-15T12:30:00.000Z";
    expect(formatDateTime(iso)).toBe(formatDateTime(new Date(iso)));
  });
});
