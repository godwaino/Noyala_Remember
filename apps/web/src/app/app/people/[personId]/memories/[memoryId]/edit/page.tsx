import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/server/supabase/server-client";
import { getMemory } from "@/server/memories/queries";
import { updateMemory } from "@/server/memories/actions";
import { MemoryForm } from "@/components/MemoryForm";

export const metadata: Metadata = { title: "Edit memory" };

export default async function EditMemoryPage({
  params,
}: {
  params: Promise<{ personId: string; memoryId: string }>;
}) {
  const { personId, memoryId } = await params;
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const memory = await getMemory(supabase, memoryId);
  if (!memory) notFound();

  return (
    <div>
      <h1 className="text-xl font-semibold">Edit memory</h1>
      <MemoryForm
        action={updateMemory.bind(null, personId, memoryId)}
        defaultValues={memory}
        submitLabel="Save changes"
      />
    </div>
  );
}
