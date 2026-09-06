import type { Memory } from "@noyala/domain";
import { memoryInputSchema, type MemoryInput } from "@noyala/domain";
import { supabase } from "./client";
import { blankToNull, toMemory, type MemoryRow } from "./mappers";

export async function listMemoriesForPerson(personId: string): Promise<Memory[]> {
  const { data, error } = await supabase
    .from("memories")
    .select("*")
    .eq("person_id", personId)
    .is("archived_at", null)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Failed to list memories: ${error.message}`);
  return (data as MemoryRow[]).map(toMemory);
}

export async function createMemory(
  userId: string,
  personId: string,
  input: MemoryInput,
): Promise<Memory> {
  const parsed = memoryInputSchema.parse(input);
  const { data, error } = await supabase
    .from("memories")
    .insert({
      user_id: userId,
      person_id: personId,
      content: parsed.content,
      category: parsed.category,
      occurred_on: blankToNull(parsed.occurredOn),
      sensitivity: parsed.sensitivity,
      source: "manual",
    })
    .select("*")
    .single();
  if (error) throw new Error(`Failed to save memory: ${error.message}`);
  return toMemory(data as MemoryRow);
}
