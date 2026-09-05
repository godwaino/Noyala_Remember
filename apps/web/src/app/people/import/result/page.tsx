import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/server/supabase/server-client";
import { undoImport } from "@/server/import/actions";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";

export const metadata: Metadata = { title: "Import complete" };

export default async function ImportResultPage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string; count?: string }>;
}) {
  const { ids, count } = await searchParams;
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const personIds = ids ? ids.split(",").filter(Boolean) : [];
  const importedCount = count ? Number(count) : personIds.length;

  return (
    <div>
      <h1 className="text-ink text-xl font-semibold">Import complete</h1>
      <p className="text-ink-muted mt-1 text-sm">
        Imported {importedCount} {importedCount === 1 ? "person" : "people"}.
      </p>
      <div className="mt-6 flex gap-3">
        <Link
          href="/people"
          className="bg-primary text-surface rounded-md px-4 py-2 text-sm font-medium"
        >
          Go to People
        </Link>
        {personIds.length > 0 ? (
          <form action={undoImport.bind(null, personIds)}>
            <ConfirmSubmitButton
              confirmMessage={`Undo this import? This deletes the ${importedCount} ${importedCount === 1 ? "person" : "people"} just added, along with any dates or memories added to them since.`}
              className="border-border text-danger rounded-md border px-4 py-2 text-sm font-medium"
            >
              Undo this import
            </ConfirmSubmitButton>
          </form>
        ) : null}
      </div>
    </div>
  );
}
