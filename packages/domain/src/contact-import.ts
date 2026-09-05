import type { RelationshipType } from "./types";
import { RELATIONSHIP_TYPE_OPTIONS } from "./types";

/**
 * One-way CSV/vCard contact import (Master Build Prompt §10). Deliberately
 * one-way: this only ever produces new `people` rows, never merges into or
 * updates an existing one, so there is no "silently overwrite newer user
 * data" risk to guard against — it doesn't touch existing rows at all.
 * Two-way sync needs a real cloud-contact provider (Stage 4 continuation,
 * blocked on OAuth app credentials this environment doesn't have — see
 * docs/integrations.md).
 */

// ---------------------------------------------------------------------------
// CSV parsing
// ---------------------------------------------------------------------------

/**
 * Minimal RFC-4180-ish CSV parser: handles quoted fields, embedded commas/
 * newlines, and doubled-quote escaping — the inverse of csv.ts's toCsv. No
 * external dependency for something this small.
 */
export function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;

  const pushField = () => {
    row.push(field);
    field = "";
  };
  const pushRow = () => {
    pushField();
    rows.push(row);
    row = [];
  };

  while (i < text.length) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += char;
      i += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (char === ",") {
      pushField();
      i += 1;
      continue;
    }
    if (char === "\r") {
      i += 1;
      continue;
    }
    if (char === "\n") {
      pushRow();
      i += 1;
      continue;
    }
    field += char;
    i += 1;
  }
  // Trailing field/row not yet terminated by a newline.
  if (field.length > 0 || row.length > 0) pushRow();

  const [headers, ...dataRows] = rows;
  return { headers: headers ?? [], rows: dataRows.filter((r) => r.some((v) => v.trim() !== "")) };
}

// ---------------------------------------------------------------------------
// Field mapping
// ---------------------------------------------------------------------------

export const PERSON_IMPORT_FIELDS = [
  "firstName",
  "lastName",
  "nickname",
  "relationshipType",
  "phone",
  "email",
  "pronouns",
  "notes",
  "birthday",
  "ignore",
] as const;

export type PersonImportField = (typeof PERSON_IMPORT_FIELDS)[number];

const HEADER_ALIASES: Record<Exclude<PersonImportField, "ignore">, string[]> = {
  firstName: ["first_name", "first name", "given name", "name", "full name"],
  lastName: ["last_name", "last name", "surname", "family name"],
  nickname: ["nickname", "nick name"],
  relationshipType: ["relationship_type", "relationship"],
  phone: ["phone", "phone number", "mobile", "mobile phone", "telephone"],
  email: ["email", "email address", "e-mail"],
  pronouns: ["pronouns"],
  notes: ["notes", "note"],
  birthday: ["birthday", "date of birth", "dob", "bday"],
};

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase();
}

/** Column index -> best-guess target field, for pre-filling the mapping UI. */
export function guessFieldMapping(headers: string[]): Record<number, PersonImportField> {
  const mapping: Record<number, PersonImportField> = {};
  const claimed = new Set<PersonImportField>();

  headers.forEach((header, index) => {
    const normalized = normalizeHeader(header);
    const match = (Object.keys(HEADER_ALIASES) as Exclude<PersonImportField, "ignore">[]).find(
      (field) => !claimed.has(field) && HEADER_ALIASES[field].includes(normalized),
    );
    if (match) {
      mapping[index] = match;
      claimed.add(match);
    } else {
      mapping[index] = "ignore";
    }
  });

  return mapping;
}

// ---------------------------------------------------------------------------
// Candidates
// ---------------------------------------------------------------------------

export interface ImportBirthday {
  month: number;
  day: number;
  year: number | null;
}

export interface PersonImportCandidate {
  sourceRowIndex: number;
  firstName: string;
  lastName: string | null;
  nickname: string | null;
  relationshipType: RelationshipType;
  phone: string | null;
  email: string | null;
  pronouns: string | null;
  notes: string | null;
  birthday: ImportBirthday | null;
}

const RELATIONSHIP_TYPE_VALUES = new Set<string>(RELATIONSHIP_TYPE_OPTIONS.map((o) => o.value));

function normalizeRelationshipType(value: string | undefined): RelationshipType {
  const normalized = value?.trim().toLowerCase();
  return normalized && RELATIONSHIP_TYPE_VALUES.has(normalized)
    ? (normalized as RelationshipType)
    : "other";
}

const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function isValidMonthDay(month: number, day: number): boolean {
  if (!Number.isInteger(month) || month < 1 || month > 12) return false;
  if (!Number.isInteger(day) || day < 1) return false;
  // 29 Feb is allowed unconditionally, matching the leap-day policy used
  // throughout the rest of the app (see dates.ts / schemas.ts).
  return day <= (DAYS_IN_MONTH[month - 1] ?? 31);
}

/** Accepts "YYYY-MM-DD", "YYYYMMDD" (vCard's compact form) and "MM/DD/YYYY".
 * Anything else is treated as unrecognized rather than guessed at. */
export function parseLooseDate(value: string): ImportBirthday | null {
  const trimmed = value.trim();

  let match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (match) {
    const [, y, m, d] = match;
    const year = Number(y);
    const month = Number(m);
    const day = Number(d);
    return isValidMonthDay(month, day) ? { year, month, day } : null;
  }

  match = /^(\d{4})(\d{2})(\d{2})$/.exec(trimmed);
  if (match) {
    const [, y, m, d] = match;
    const year = Number(y);
    const month = Number(m);
    const day = Number(d);
    return isValidMonthDay(month, day) ? { year, month, day } : null;
  }

  match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmed);
  if (match) {
    const [, m, d, y] = match;
    const year = Number(y);
    const month = Number(m);
    const day = Number(d);
    return isValidMonthDay(month, day) ? { year, month, day } : null;
  }

  // Some vCard producers omit the year for a recurring birthday
  // (RFC 6350's "--MMDD" form).
  match = /^--(\d{2})(\d{2})$/.exec(trimmed);
  if (match) {
    const [, m, d] = match;
    const month = Number(m);
    const day = Number(d);
    return isValidMonthDay(month, day) ? { year: null, month, day } : null;
  }

  return null;
}

function cell(row: string[], index: number | undefined): string | undefined {
  if (index === undefined) return undefined;
  return row[index]?.trim();
}

export function buildCandidatesFromCsvRows(
  rows: string[][],
  mapping: Record<number, PersonImportField>,
): PersonImportCandidate[] {
  const indexFor = (field: PersonImportField): number | undefined => {
    const entry = Object.entries(mapping).find(([, v]) => v === field);
    return entry ? Number(entry[0]) : undefined;
  };

  const firstNameIdx = indexFor("firstName");
  const lastNameIdx = indexFor("lastName");
  const nicknameIdx = indexFor("nickname");
  const relationshipIdx = indexFor("relationshipType");
  const phoneIdx = indexFor("phone");
  const emailIdx = indexFor("email");
  const pronounsIdx = indexFor("pronouns");
  const notesIdx = indexFor("notes");
  const birthdayIdx = indexFor("birthday");

  return rows.map((row, sourceRowIndex) => {
    const birthdayRaw = cell(row, birthdayIdx);
    return {
      sourceRowIndex,
      firstName: cell(row, firstNameIdx) ?? "",
      lastName: cell(row, lastNameIdx) || null,
      nickname: cell(row, nicknameIdx) || null,
      relationshipType: normalizeRelationshipType(cell(row, relationshipIdx)),
      phone: cell(row, phoneIdx) || null,
      email: cell(row, emailIdx) || null,
      pronouns: cell(row, pronounsIdx) || null,
      notes: cell(row, notesIdx) || null,
      birthday: birthdayRaw ? parseLooseDate(birthdayRaw) : null,
    };
  });
}

// ---------------------------------------------------------------------------
// vCard parsing (inverse of vcard.ts's toVCard, plus BDAY which the encoder
// doesn't emit but real-world exports commonly include)
// ---------------------------------------------------------------------------

/** Splits on `separator`, skipping over backslash-escaped occurrences (e.g.
 * `\;` inside an N property must not be treated as a field boundary). */
function splitVCardValue(value: string, separator: string): string[] {
  const parts: string[] = [];
  let current = "";
  for (let i = 0; i < value.length; i += 1) {
    const char = value[i];
    if (char === "\\" && i + 1 < value.length) {
      current += char + value[i + 1];
      i += 1;
      continue;
    }
    if (char === separator) {
      parts.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  parts.push(current);
  return parts;
}

function unescapeVCardText(value: string): string {
  return value
    .replace(/\\n/gi, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\");
}

/** Splits "PROP;PARAM=x:value" into { name: "PROP", value }, ignoring params. */
function parseVCardLine(line: string): { name: string; value: string } | null {
  const colonIndex = line.indexOf(":");
  if (colonIndex === -1) return null;
  const rawName = line.slice(0, colonIndex);
  const name = rawName.split(";")[0]?.toUpperCase().trim();
  if (!name) return null;
  return { name, value: line.slice(colonIndex + 1) };
}

export function parseVCardCollection(text: string): PersonImportCandidate[] {
  // Unfold folded lines (a leading space/tab continues the previous line),
  // per RFC 6350, before splitting into logical lines.
  const unfolded = text.replace(/\r\n/g, "\n").replace(/\n[ \t]/g, "");
  const lines = unfolded.split("\n").map((l) => l.trim());

  const cards: string[][] = [];
  let current: string[] | null = null;
  for (const line of lines) {
    if (/^BEGIN:VCARD$/i.test(line)) {
      current = [];
      continue;
    }
    if (/^END:VCARD$/i.test(line)) {
      if (current) cards.push(current);
      current = null;
      continue;
    }
    if (current && line) current.push(line);
  }

  return cards.map((cardLines, sourceRowIndex) => {
    let firstName = "";
    let lastName: string | null = null;
    let nickname: string | null = null;
    let phone: string | null = null;
    let email: string | null = null;
    let notes: string | null = null;
    let birthday: ImportBirthday | null = null;
    let fn: string | null = null;

    for (const line of cardLines) {
      const parsed = parseVCardLine(line);
      if (!parsed) continue;
      const value = unescapeVCardText(parsed.value);

      switch (parsed.name) {
        case "N": {
          const [last, first] = splitVCardValue(parsed.value, ";");
          if (first) firstName = unescapeVCardText(first);
          if (last) lastName = unescapeVCardText(last) || null;
          break;
        }
        case "FN":
          fn = value;
          break;
        case "NICKNAME":
          nickname = value || null;
          break;
        case "TEL":
          phone = value || null;
          break;
        case "EMAIL":
          email = value || null;
          break;
        case "NOTE":
          notes = value || null;
          break;
        case "BDAY":
          birthday = parseLooseDate(value.trim());
          break;
        default:
          break;
      }
    }

    if (!firstName && fn) {
      // No structured N property — fall back to the display name as a whole.
      firstName = fn;
    }

    return {
      sourceRowIndex,
      firstName,
      lastName,
      nickname,
      relationshipType: "other" as RelationshipType,
      phone,
      email,
      pronouns: null,
      notes,
      birthday,
    };
  });
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export interface CandidateValidation {
  valid: boolean;
  error?: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateCandidate(candidate: PersonImportCandidate): CandidateValidation {
  if (!candidate.firstName.trim()) {
    return { valid: false, error: "Missing a name" };
  }
  if (candidate.firstName.length > 120) {
    return { valid: false, error: "Name is too long" };
  }
  if (candidate.email && !EMAIL_PATTERN.test(candidate.email)) {
    return { valid: false, error: "Invalid email address" };
  }
  return { valid: true };
}

// ---------------------------------------------------------------------------
// Duplicate detection
// ---------------------------------------------------------------------------

export interface ExistingPersonLite {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
  phone: string | null;
}

export interface DuplicateMatch {
  candidateIndex: number;
  existingPersonId: string;
  existingPersonName: string;
  reason: "email" | "phone" | "name";
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function normalizePhone(value: string): string {
  return value.replace(/\D/g, "");
}

function normalizeName(firstName: string, lastName: string | null): string {
  return [firstName, lastName].filter(Boolean).join(" ").trim().toLowerCase().replace(/\s+/g, " ");
}

/** Every category (Master Build Prompt §10's "duplicate matching"). Checks
 * email first, then phone, then full name — the first match wins so a
 * candidate is never reported as duplicate for more than one reason. */
export function findDuplicateMatches(
  candidates: PersonImportCandidate[],
  existing: ExistingPersonLite[],
): DuplicateMatch[] {
  const byEmail = new Map<string, ExistingPersonLite>();
  const byPhone = new Map<string, ExistingPersonLite>();
  const byName = new Map<string, ExistingPersonLite>();

  for (const person of existing) {
    if (person.email) byEmail.set(normalizeEmail(person.email), person);
    if (person.phone) byPhone.set(normalizePhone(person.phone), person);
    byName.set(normalizeName(person.firstName, person.lastName), person);
  }

  const matches: DuplicateMatch[] = [];
  candidates.forEach((candidate, candidateIndex) => {
    const emailMatch = candidate.email ? byEmail.get(normalizeEmail(candidate.email)) : undefined;
    const phoneMatch = candidate.phone ? byPhone.get(normalizePhone(candidate.phone)) : undefined;
    const nameMatch = byName.get(normalizeName(candidate.firstName, candidate.lastName));

    const match = emailMatch
      ? { person: emailMatch, reason: "email" as const }
      : phoneMatch
        ? { person: phoneMatch, reason: "phone" as const }
        : nameMatch
          ? { person: nameMatch, reason: "name" as const }
          : null;

    if (match) {
      matches.push({
        candidateIndex,
        existingPersonId: match.person.id,
        existingPersonName: [match.person.firstName, match.person.lastName].filter(Boolean).join(" "),
        reason: match.reason,
      });
    }
  });

  return matches;
}

