import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/server/supabase/server-client";
import { getPerson } from "@/server/people/queries";
import { updatePerson } from "@/server/people/actions";
import { PersonForm } from "@/components/PersonForm";

export const metadata: Metadata = { title: "Edit person" };

export default async function EditPersonPage({
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
      <h1 className="text-xl font-semibold">Edit {person.firstName}</h1>
      <PersonForm
        action={updatePerson.bind(null, personId)}
        defaultValues={person}
        submitLabel="Save changes"
      />
    </div>
  );
}
