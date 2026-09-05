import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/server/supabase/server-client";
import { createPerson } from "@/server/people/actions";
import { PersonForm } from "@/components/PersonForm";

export const metadata: Metadata = { title: "Add person" };

export default async function NewPersonPage() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div>
      <h1 className="text-xl font-semibold">Add a person</h1>
      <p className="text-ink-muted mt-1 text-sm">
        Just a name and how you know them is enough to start — you can add
        dates and memories any time from their page.
      </p>
      <PersonForm action={createPerson} submitLabel="Add person" />
    </div>
  );
}
