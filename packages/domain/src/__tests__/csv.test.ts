import { describe, expect, it } from "vitest";
import { toCsv, toCsvField, toCsvRow } from "../csv";

describe("toCsvField", () => {
  it("leaves plain values untouched", () => {
    expect(toCsvField("Amara")).toBe("Amara");
    expect(toCsvField(42)).toBe("42");
  });

  it("renders null/undefined as an empty field", () => {
    expect(toCsvField(null)).toBe("");
    expect(toCsvField(undefined)).toBe("");
  });

  it("quotes a field containing a comma", () => {
    expect(toCsvField("Doe, Jane")).toBe('"Doe, Jane"');
  });

  it("doubles embedded quotes and wraps in quotes", () => {
    expect(toCsvField('She said "hi"')).toBe('"She said ""hi"""');
  });

  it("quotes a field containing a newline", () => {
    expect(toCsvField("line1\nline2")).toBe('"line1\nline2"');
  });
});

describe("toCsvRow / toCsv", () => {
  it("joins fields with commas and rows with CRLF, quoting only where needed", () => {
    const csv = toCsv(
      ["name", "note"],
      [
        ["Amara", "loves, pottery"],
        ["Priya", null],
      ],
    );
    expect(csv).toBe('name,note\r\nAmara,"loves, pottery"\r\nPriya,\r\n');
  });

  it("toCsvRow matches the per-row half of toCsv", () => {
    expect(toCsvRow(["a", "b,c"])).toBe('a,"b,c"');
  });
});
