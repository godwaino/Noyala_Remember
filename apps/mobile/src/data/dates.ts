import type { ImportantDate } from "@noyala/domain";
import { importantDateInputSchema, type ImportantDateInput } from "@noyala/domain";
import { supabase } from "./client";
import { toImportantDate, type ImportantDateRow } from "./mappers";

export async function listImportantDatesForUser(userId: string): Promise<ImportantDate[]> {
  const { data, error } = await supabase.from("important_dates").select("*").eq("user_id", userId);
  if (error) throw new Error(`Failed to list dates: ${error.message}`);
  return (data as ImportantDateRow[]).map(toImportantDate);
}

export async function listImportantDatesForPerson(personId: string): Promise<ImportantDate[]> {
  const { data, error } = await supabase
    .from("important_dates")
    .select("*")
    .eq("person_id", personId)
    .order("month", { ascending: true })
    .order("day", { ascending: true });
  if (error) throw new Error(`Failed to list dates: ${error.message}`);
  return (data as ImportantDateRow[]).map(toImportantDate);
}

export async function getImportantDate(id: string): Promise<ImportantDate | null> {
  const { data, error } = await supabase
    .from("important_dates")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Failed to load date: ${error.message}`);
  return data ? toImportantDate(data as ImportantDateRow) : null;
}

export async function createImportantDate(
  userId: string,
  personId: string,
  input: ImportantDateInput,
): Promise<ImportantDate> {
  const parsed = importantDateInputSchema.parse(input);
  const { data, error } = await supabase
    .from("important_dates")
    .insert({
      user_id: userId,
      person_id: personId,
      type: parsed.type,
      label: parsed.label,
      month: parsed.month,
      day: parsed.day,
      year: parsed.year,
      recurs_annually: parsed.recursAnnually,
      reminder_offsets: parsed.reminderOffsets,
      timezone: parsed.timezone,
    })
    .select("*")
    .single();
  if (error) throw new Error(`Failed to save date: ${error.message}`);
  return toImportantDate(data as ImportantDateRow);
}
