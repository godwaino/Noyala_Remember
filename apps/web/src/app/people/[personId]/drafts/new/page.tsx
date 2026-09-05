import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/server/supabase/server-client";
import { getPerson } from "@/server/people/queries";
import { listMemoriesForPerson } from "@/server/memories/queries";
import { listImportantDatesForPerson } from "@/server/important-dates/queries";
import { getDraftBatch } from "@/server/messages/queries";
import { readDraftMetadata } from "@/server/messages/mappers";
import { generateMessageDraft } from "@/server/messages/actions";
import { MessageStudioForm, type MessageStudioPrefill } from "@/components/MessageStudioForm";

export const metadata: Metadata = { title: "Message Studio" };

export default async function MessageStudioPage({
  params,
  searchParams,
}: {
  params: Promise<{ personId: string }>;
  searchParams: Promise<{ regenerate?: string }>;
}) {
  const { personId } = await params;
  const { regenerate } = await searchParams;
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const person = await getPerson(supabase, personId);
  if (!person) notFound();

  const [memories, importantDates] = await Promise.all([
    listMemoriesForPerson(supabase, personId),
    listImportantDatesForPerson(supabase, personId),
  ]);

  let prefill: MessageStudioPrefill | undefined;
  if (regenerate) {
    const batch = await getDraftBatch(supabase, regenerate);
    const metadata = batch[0] ? readDraftMetadata(batch[0]) : null;
    if (metadata) {
      prefill = {
        occasion: metadata.generation.occasion,
        tone: metadata.generation.tone,
        channel: metadata.generation.channel,
        customInstruction: metadata.generation.customInstruction ?? undefined,
        importantDateId: metadata.generation.importantDateId ?? undefined,
        selectedMemoryIds: metadata.generation.selectedMemoryIds,
      };
    }
  }

  return (
    <div>
      <Link href={`/people/${personId}`} className="text-primary text-sm">
        &larr; Back to {person.firstName}
      </Link>
      <h1 className="text-ink mt-2 text-xl font-semibold">
        Write a message to {person.firstName}
      </h1>
      <p className="text-ink-muted mt-1 text-sm">
        Choose what to include, then generate three options to pick from and edit freely.
      </p>
      <MessageStudioForm
        action={generateMessageDraft.bind(null, personId)}
        memories={memories}
        importantDates={importantDates}
        prefill={prefill}
      />
    </div>
  );
}
