import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/server/supabase/server-client";
import { getPerson } from "@/server/people/queries";
import { createImportantDate } from "@/server/important-dates/actions";
import { ImportantDateForm } from "@/components/ImportantDateForm";

export const metadata: Metadata = { title: "Add date" };

export default async function NewImportantDatePage({
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
      <h1 className="text-xl font-semibold">Add a date for {person.firstName}</h1>
      <ImportantDateForm
        action={createImportantDate.bind(null, personId)}
        submitLabel="Add date"
      />
    </div>
  );
}
