import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/server/supabase/server-client";
import { listPeople } from "@/server/people/queries";
import { ImportWizard } from "@/components/ImportWizard";

export const metadata: Metadata = { title: "Import people" };

export default async function ImportPeoplePage() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const people = await listPeople(supabase, user.id, { includeArchived: true });
  const existingPeople = people.map((p) => ({
    id: p.id,
    firstName: p.firstName,
    lastName: p.lastName,
    email: p.email,
    phone: p.phone,
  }));

  return (
    <div>
      <Link href="/people" className="text-primary text-sm">
        &larr; Back to People
      </Link>
      <h1 className="text-ink mt-2 text-xl font-semibold">Import people</h1>
      <p className="text-ink-muted mt-1 text-sm">
        From a CSV export, a vCard (.vcf) file, or this device&apos;s own contacts. Nothing is imported
        until you review and confirm.
      </p>
      <ImportWizard existingPeople={existingPeople} />
    </div>
  );
}
