import { describe, expect, it } from "vitest";
import {
  buildCandidatesFromCsvRows,
  findDuplicateMatches,
  guessFieldMapping,
  parseCsv,
  parseLooseDate,
  parseVCardCollection,
  validateCandidate,
  type ExistingPersonLite,
} from "../contact-import";

describe("parseCsv", () => {
  it("parses a simple CSV into headers and rows", () => {
    const result = parseCsv("first_name,last_name\r\nAda,Lovelace\r\nGrace,Hopper\r\n");
    expect(result.headers).toEqual(["first_name", "last_name"]);
    expect(result.rows).toEqual([
      ["Ada", "Lovelace"],
      ["Grace", "Hopper"],
    ]);
  });

  it("handles quoted fields with embedded commas, quotes and newlines", () => {
    const result = parseCsv(
      'first_name,notes\r\n"Ada","Loves ""math"", and cats"\r\n"Grace","Line one\nline two"\r\n',
    );
    expect(result.rows).toEqual([
      ["Ada", 'Loves "math", and cats'],
      ["Grace", "Line one\nline two"],
    ]);
  });

  it("skips blank trailing rows", () => {
    const result = parseCsv("first_name\r\nAda\r\n\r\n");
    expect(result.rows).toEqual([["Ada"]]);
  });
});

describe("guessFieldMapping", () => {
  it("maps common header aliases to the right field", () => {
    const mapping = guessFieldMapping(["First Name", "Last Name", "Email Address", "Notes"]);
    expect(mapping).toEqual({ 0: "firstName", 1: "lastName", 2: "email", 3: "notes" });
  });

  it("marks unrecognized headers as ignore", () => {
    const mapping = guessFieldMapping(["Company", "Job Title"]);
    expect(mapping).toEqual({ 0: "ignore", 1: "ignore" });
  });

  it("never assigns the same field to two columns", () => {
    const mapping = guessFieldMapping(["Name", "Full Name"]);
    const assigned = Object.values(mapping).filter((f) => f !== "ignore");
    expect(new Set(assigned).size).toBe(assigned.length);
  });
});

describe("buildCandidatesFromCsvRows", () => {
  it("builds candidates using the given mapping", () => {
    const rows = [["Ada", "Lovelace", "ada@example.com"]];
    const mapping = { 0: "firstName", 1: "lastName", 2: "email" } as const;
    const [candidate] = buildCandidatesFromCsvRows(rows, mapping);
    expect(candidate).toMatchObject({
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@example.com",
      relationshipType: "other",
    });
  });

  it("parses a mapped birthday column", () => {
    const rows = [["Ada", "1990-06-15"]];
    const mapping = { 0: "firstName", 1: "birthday" } as const;
    const [candidate] = buildCandidatesFromCsvRows(rows, mapping);
    expect(candidate?.birthday).toEqual({ year: 1990, month: 6, day: 15 });
  });
});

describe("parseLooseDate", () => {
  it("parses ISO dates", () => {
    expect(parseLooseDate("1990-06-15")).toEqual({ year: 1990, month: 6, day: 15 });
  });

  it("parses vCard's compact YYYYMMDD form", () => {
    expect(parseLooseDate("19900615")).toEqual({ year: 1990, month: 6, day: 15 });
  });

  it("parses US-style MM/DD/YYYY", () => {
    expect(parseLooseDate("6/15/1990")).toEqual({ year: 1990, month: 6, day: 15 });
  });

  it("parses a yearless recurring birthday (--MMDD)", () => {
    expect(parseLooseDate("--0615")).toEqual({ year: null, month: 6, day: 15 });
  });

  it("allows 29 Feb regardless of year, per the leap-day policy", () => {
    expect(parseLooseDate("2023-02-29")).toEqual({ year: 2023, month: 2, day: 29 });
  });

  it("returns null for unrecognized formats", () => {
    expect(parseLooseDate("June 15th")).toBeNull();
  });

  it("returns null for an invalid calendar day", () => {
    expect(parseLooseDate("2023-02-30")).toBeNull();
    expect(parseLooseDate("2023-13-01")).toBeNull();
  });
});

describe("parseVCardCollection", () => {
  it("parses name, phone, email, notes and BDAY", () => {
    const vcard = [
      "BEGIN:VCARD",
      "VERSION:3.0",
      "FN:Ada Lovelace",
      "N:Lovelace;Ada;;;",
      "TEL:+1 555 0100",
      "EMAIL:ada@example.com",
      "NOTE:Loves math",
      "BDAY:1815-12-10",
      "END:VCARD",
    ].join("\r\n");

    const [candidate] = parseVCardCollection(vcard);
    expect(candidate).toMatchObject({
      firstName: "Ada",
      lastName: "Lovelace",
      phone: "+1 555 0100",
      email: "ada@example.com",
      notes: "Loves math",
      birthday: { year: 1815, month: 12, day: 10 },
    });
  });

  it("parses multiple vCards in one file", () => {
    const vcard = [
      "BEGIN:VCARD",
      "N:Lovelace;Ada;;;",
      "END:VCARD",
      "BEGIN:VCARD",
      "N:Hopper;Grace;;;",
      "END:VCARD",
    ].join("\n");
    expect(parseVCardCollection(vcard)).toHaveLength(2);
  });

  it("falls back to FN when N is missing", () => {
    const vcard = ["BEGIN:VCARD", "FN:Cher", "END:VCARD"].join("\n");
    const [candidate] = parseVCardCollection(vcard);
    expect(candidate?.firstName).toBe("Cher");
  });

  it("unescapes vCard text escaping", () => {
    const vcard = ["BEGIN:VCARD", "N:;Ada\\, the\\; Great;;;", "NOTE:Line1\\nLine2", "END:VCARD"].join("\n");
    const [candidate] = parseVCardCollection(vcard);
    expect(candidate?.firstName).toBe("Ada, the; Great");
    expect(candidate?.notes).toBe("Line1\nLine2");
  });
});

describe("validateCandidate", () => {
  const base = {
    sourceRowIndex: 0,
    firstName: "Ada",
    lastName: null,
    nickname: null,
    relationshipType: "other" as const,
    phone: null,
    email: null,
    pronouns: null,
    notes: null,
    birthday: null,
  };

  it("accepts a candidate with just a first name", () => {
    expect(validateCandidate(base)).toEqual({ valid: true });
  });

  it("rejects a candidate with no name", () => {
    expect(validateCandidate({ ...base, firstName: "" }).valid).toBe(false);
  });

  it("rejects an invalid email", () => {
    expect(validateCandidate({ ...base, email: "not-an-email" }).valid).toBe(false);
  });

  it("accepts a valid email", () => {
    expect(validateCandidate({ ...base, email: "ada@example.com" }).valid).toBe(true);
  });
});

describe("findDuplicateMatches", () => {
  const existing: ExistingPersonLite[] = [
    { id: "p1", firstName: "Ada", lastName: "Lovelace", email: "ada@example.com", phone: "555-0100" },
    { id: "p2", firstName: "Grace", lastName: "Hopper", email: null, phone: "555-0200" },
  ];

  function candidate(overrides: Record<string, unknown> = {}) {
    return {
      sourceRowIndex: 0,
      firstName: "New",
      lastName: null,
      nickname: null,
      relationshipType: "other" as const,
      phone: null,
      email: null,
      pronouns: null,
      notes: null,
      birthday: null,
      ...overrides,
    };
  }

  it("matches by email, case-insensitively", () => {
    const matches = findDuplicateMatches([candidate({ email: "ADA@EXAMPLE.COM" })], existing);
    expect(matches).toEqual([
      { candidateIndex: 0, existingPersonId: "p1", existingPersonName: "Ada Lovelace", reason: "email" },
    ]);
  });

  it("matches by phone, ignoring formatting", () => {
    const matches = findDuplicateMatches([candidate({ phone: "(555) 020-0" })], existing);
    expect(matches).toMatchObject([{ existingPersonId: "p2", reason: "phone" }]);
  });

  it("matches by normalized full name as a last resort", () => {
    const matches = findDuplicateMatches([candidate({ firstName: "ada", lastName: "LOVELACE" })], existing);
    expect(matches).toMatchObject([{ existingPersonId: "p1", reason: "name" }]);
  });

  it("reports no match for a genuinely new person", () => {
    expect(findDuplicateMatches([candidate({ firstName: "Someone", lastName: "Else" })], existing)).toEqual(
      [],
    );
  });
});
