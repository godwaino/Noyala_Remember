import { validateCandidate, findDuplicateMatches, type ExistingPersonLite, type PersonImportCandidate } from "@noyala/domain";
import { supabase } from "./client";
import { listPeople } from "./people";

function truncate(value: string | null, max: number): string | null {
  if (!value) return null;
  return value.length > max ? value.slice(0, max) : value;
}

export async function findDuplicatesAgainstExisting(
  userId: string,
  candidates: PersonImportCandidate[],
) {
  const existing = await listPeople(userId);
  const lite: ExistingPersonLite[] = existing.map((p) => ({
    id: p.id,
    firstName: p.firstName,
    lastName: p.lastName,
    email: p.email,
    phone: p.phone,
  }));
  return findDuplicateMatches(candidates, lite);
}

export interface ImportOutcome {
  personIds: string[];
}

/** One-way only — always creates new `people` rows, never updates an
 * existing one, mirroring apps/web/src/server/import/actions.ts exactly. */
export async function confirmImport(
  userId: string,
  candidates: PersonImportCandidate[],
): Promise<ImportOutcome> {
  const valid = candidates.filter((c) => validateCandidate(c).valid);
  if (valid.length === 0) throw new Error("None of the selected rows were valid.");

  const personRows = valid.map((c) => ({
    user_id: userId,
    first_name: truncate(c.firstName.trim(), 120) ?? c.firstName.trim(),
    last_name: truncate(c.lastName, 120),
    nickname: truncate(c.nickname, 120),
    relationship_type: c.relationshipType,
    phone: truncate(c.phone, 40),
    email: c.email,
    pronouns: truncate(c.pronouns, 40),
    notes: truncate(c.notes, 4000),
  }));

  const { data: inserted, error } = await supabase.from("people").insert(personRows).select("id");
  if (error || !inserted) throw new Error(error?.message ?? "Could not import these contacts.");

  const dateRows = valid
    .map((c, i) => ({ birthday: c.birthday, personId: inserted[i]?.id }))
    .filter(
      (x): x is { birthday: NonNullable<PersonImportCandidate["birthday"]>; personId: string } =>
        Boolean(x.birthday && x.personId),
    )
    .map(({ birthday, personId }) => ({
      user_id: userId,
      person_id: personId,
      type: "birthday" as const,
      label: "Birthday",
      month: birthday.month,
      day: birthday.day,
      year: birthday.year !== null && birthday.year >= 1900 && birthday.year <= 2100 ? birthday.year : null,
      recurs_annually: true,
      reminder_offsets: [14, 7, 1, 0],
      timezone: "UTC",
    }));

  if (dateRows.length > 0) {
    const { error: dateError } = await supabase.from("important_dates").insert(dateRows);
    if (dateError) {
      // Best-effort: the people are already imported, so a birthday
      // failure shouldn't roll back the whole import.
      console.warn("confirmImport: failed to insert birthdays", dateError.message);
    }
  }

  return { personIds: inserted.map((r) => r.id as string) };
}

/** The "undo window" Master Build Prompt §10 asks for — deletes exactly
 * the people a specific import just created. */
export async function undoImport(userId: string, personIds: string[]): Promise<void> {
  const { error } = await supabase.from("people").delete().eq("user_id", userId).in("id", personIds);
  if (error) throw new Error(error.message);
}
