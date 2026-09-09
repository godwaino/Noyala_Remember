import type { Metadata } from "next";
import Link from "next/link";
import { redirect, unstable_rethrow } from "next/navigation";
import { EmptyState } from "@/components/EmptyState";
import { getSupabaseServerClient } from "@/server/supabase/server-client";
import { reportError } from "@/server/observability/error-monitoring";
import { getMyDeletionRequest } from "@/server/account/queries";
import { AccountDeletionForm } from "./AccountDeletionForm";
import { CancelDeletionButton } from "./CancelDeletionButton";

export const metadata: Metadata = { title: "Delete account" };

export default async function DeleteAccountPage() {
  let email: string | null = null;
  let configured = true;
  let supabase: Awaited<ReturnType<typeof getSupabaseServerClient>> | undefined;

  try {
    supabase = await getSupabaseServerClient();
    const result = await supabase.auth.getUser();
    email = result.data.user?.email ?? null;
  } catch (error) {
    unstable_rethrow(error);
    reportError(error, { page: "account/delete" });
    configured = false;
  }

  if (!configured) {
    return (
      <EmptyState
        title="Sign-in isn't configured yet"
        description="This environment doesn't have a Supabase project connected. See docs/roadmap.md for the setup steps."
      />
    );
  }

  if (!email) {
    redirect(`/login?next=${encodeURIComponent("/account/delete")}`);
  }

  const deletionRequest = await getMyDeletionRequest(supabase!);

  // Already scheduled: skip the whole re-verify/consequences/confirm flow
  // and go straight to the one thing left to do here — cancel it, or
  // leave it be.
  if (deletionRequest?.status === "pending") {
    return (
      <div>
        <h1 className="text-xl font-semibold">Deletion scheduled</h1>
        <div className="border-danger bg-danger/5 mt-4 rounded-md border p-4">
          <p className="text-ink text-sm">
            Your account will be permanently erased on{" "}
            {new Date(deletionRequest.eraseAfter).toLocaleDateString(undefined, {
              dateStyle: "long",
            })}
            . Everything still works until then.
          </p>
        </div>
        <CancelDeletionButton />
        <Link href="/account" className="text-primary mt-6 inline-block text-sm underline">
          Back to your account
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-xl font-semibold">Delete account</h1>
      <p className="text-ink-muted mt-1 text-sm">
        We&apos;ll confirm it&apos;s you, then walk through what this deletes before anything
        happens.
      </p>
      <AccountDeletionForm email={email!} />
    </div>
  );
}
