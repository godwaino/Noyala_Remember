"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { validateCandidate, type PersonImportCandidate } from "@noyala/domain";
import { getSupabaseServerClient } from "@/server/supabase/server-client";
import { reportError } from "@/server/observability/error-monitoring";

export interface ImportFormState {
  status: "idle" | "error";
  message?: string;
}

/** A technical safety cap on one import batch, not a validated product
 * number — mirrors the reasoning in docs/integrations.md's "Acceptance
 * budgets" section for other such caps. */
const MAX_IMPORT_ROWS = 1000;

function truncate(value: string | null, max: number): string | null {
  if (!value) return null;
  return value.length > max ? value.slice(0, max) : value;
}

/**
 * One-way import only — this always creates new `people` rows and never
 * updates an existing one, so there is no "overwrite newer data" risk by
 * construction (Master Build Prompt §10's exit gate). Candidates are
 * re-validated here even though the wizard already validated them
 * client-side, since the payload crossed the network as plain JSON.
 */
export async function confirmImport(
  _prevState: ImportFormState,
  formData: FormData,
): Promise<ImportFormState> {
  const raw = formData.get("candidates");
  if (typeof raw !== "string") {
    return { status: "error", message: "Nothing to import." };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { status: "error", message: "Could not read the import data." };
  }
  if (!Array.isArray(parsed) || parsed.length === 0) {
    return { status: "error", message: "No rows selected to import." };
  }
  if (parsed.length > MAX_IMPORT_ROWS) {
    return {
      status: "error",
      message: `Too many rows in one import (max ${MAX_IMPORT_ROWS}) — please split into smaller files.`,
    };
  }

  const candidates = (parsed as PersonImportCandidate[]).filter((c) => validateCandidate(c).valid);
  if (candidates.length === 0) {
    return { status: "error", message: "None of the selected rows were valid." };
  }

  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const personRows = candidates.map((c) => ({
    user_id: user.id,
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
  if (error || !inserted) {
    reportError(error, { action: "confirmImport.insertPeople" });
    return { status: "error", message: error?.message ?? "Could not import these contacts." };
  }

  const dateRows = candidates
    .map((c, i) => ({ birthday: c.birthday, personId: inserted[i]?.id }))
    .filter(
      (x): x is { birthday: NonNullable<PersonImportCandidate["birthday"]>; personId: string } =>
        Boolean(x.birthday && x.personId),
    )
    .map(({ birthday, personId }) => ({
      user_id: user.id,
      person_id: personId,
      type: "birthday" as const,
      label: "Birthday",
      month: birthday.month,
      day: birthday.day,
      // The important_dates.year check constraint only allows 1900-2100
      // (see docs/product.md's "never fabricate a birth year" — this is
      // the same range importantDateInputSchema enforces for manual entry).
      // A source file with a year outside that range just drops the year
      // for that one row rather than failing the whole import batch.
      year: birthday.year !== null && birthday.year >= 1900 && birthday.year <= 2100 ? birthday.year : null,
      recurs_annually: true,
      reminder_offsets: [14, 7, 1, 0],
      timezone: "UTC",
    }));

  if (dateRows.length > 0) {
    // Best-effort: the people are already imported, so a birthday failure
    // shouldn't roll back the whole import — just log it.
    const { error: dateError } = await supabase.from("important_dates").insert(dateRows);
    if (dateError) reportError(dateError, { action: "confirmImport.insertDates" });
  }

  revalidatePath("/people");
  const ids = inserted.map((r) => r.id as string);
  redirect(`/people/import/result?ids=${ids.join(",")}&count=${ids.length}`);
}

/** Deletes exactly the people a specific import just created — the
 * "undo window" Master Build Prompt §10 asks for. Scoped to both the
 * owning user and the exact ids so it can never touch anything else. */
export async function undoImport(personIds: string[]): Promise<void> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.from("people").delete().eq("user_id", user.id).in("id", personIds);
  if (error) {
    reportError(error, { action: "undoImport" });
    return;
  }

  revalidatePath("/people");
  redirect("/people");
}
