import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/server/supabase/server-client";
import { getImportantDate } from "@/server/important-dates/queries";
import { updateImportantDate } from "@/server/important-dates/actions";
import { ImportantDateForm } from "@/components/ImportantDateForm";

export const metadata: Metadata = { title: "Edit date" };

export default async function EditImportantDatePage({
  params,
}: {
  params: Promise<{ personId: string; dateId: string }>;
}) {
  const { personId, dateId } = await params;
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const date = await getImportantDate(supabase, dateId);
  if (!date) notFound();

  return (
    <div>
      <h1 className="text-xl font-semibold">Edit {date.label}</h1>
      <ImportantDateForm
        action={updateImportantDate.bind(null, personId, dateId)}
        defaultValues={date}
        submitLabel="Save changes"
      />
    </div>
  );
}
