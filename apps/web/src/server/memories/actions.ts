"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { memoryInputSchema } from "@noyala/domain";
import { getSupabaseServerClient } from "@/server/supabase/server-client";
import { reportError } from "@/server/observability/error-monitoring";

export interface MemoryFormState {
  status: "idle" | "error";
  message?: string;
}

function parseMemoryForm(formData: FormData) {
  return memoryInputSchema.safeParse({
    content: formData.get("content"),
    category: formData.get("category"),
    occurredOn: formData.get("occurredOn") || undefined,
    sensitivity: formData.get("sensitivity"),
  });
}

export async function createMemory(
  personId: string,
  _prevState: MemoryFormState,
  formData: FormData,
): Promise<MemoryFormState> {
  const parsed = parseMemoryForm(formData);
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message };
  }

  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.from("memories").insert({
    user_id: user.id,
    person_id: personId,
    content: parsed.data.content,
    category: parsed.data.category,
    occurred_on: parsed.data.occurredOn || null,
    sensitivity: parsed.data.sensitivity,
    source: "manual",
  });

  if (error) {
    reportError(error, { action: "createMemory", personId });
    return { status: "error", message: error.message };
  }

  revalidatePath(`/people/${personId}`);
  redirect(`/people/${personId}`);
}

export async function updateMemory(
  personId: string,
  memoryId: string,
  _prevState: MemoryFormState,
  formData: FormData,
): Promise<MemoryFormState> {
  const parsed = parseMemoryForm(formData);
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message };
  }

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase
    .from("memories")
    .update({
      content: parsed.data.content,
      category: parsed.data.category,
      occurred_on: parsed.data.occurredOn || null,
      sensitivity: parsed.data.sensitivity,
    })
    .eq("id", memoryId);

  if (error) {
    reportError(error, { action: "updateMemory", memoryId });
    return { status: "error", message: error.message };
  }

  revalidatePath(`/people/${personId}`);
  redirect(`/people/${personId}`);
}

export async function archiveMemory(personId: string, memoryId: string): Promise<void> {
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase
    .from("memories")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", memoryId);
  if (error) reportError(error, { action: "archiveMemory", memoryId });
  revalidatePath(`/people/${personId}`);
}
