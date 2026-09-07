import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/server/supabase/server-client";
import { getPerson } from "@/server/people/queries";
import { createMemory } from "@/server/memories/actions";
import { MemoryForm } from "@/components/MemoryForm";

export const metadata: Metadata = { title: "Add memory" };

export default async function NewMemoryPage({
  params,
}: {
  params: Promise<{ personId: string }>;
}) {
  const { personId } = await params;
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const person = await getPerson(supabase, personId);
  if (!person) notFound();

  return (
    <div>
      <h1 className="text-xl font-semibold">Add a memory about {person.firstName}</h1>
      <MemoryForm action={createMemory.bind(null, personId)} submitLabel="Add memory" />
    </div>
  );
}
