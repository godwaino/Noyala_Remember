import type { Metadata } from "next";
import Link from "next/link";
import { redirect, unstable_rethrow } from "next/navigation";
import { EmptyState } from "@/components/EmptyState";
import { getSupabaseServerClient } from "@/server/supabase/server-client";
import { reportError } from "@/server/observability/error-monitoring";
import { getProfile } from "@/server/profile/queries";
import { getMyDeletionRequest } from "@/server/account/queries";
import { signOutFromAccount } from "@/server/account/actions";

export const metadata: Metadata = { title: "Your account" };

/**
 * The account/profile hub — separate from /app/settings, which stays the
 * signed-in product's own preferences screen (notification channel,
 * reminder offsets). This page is the one the marketing site's header and
 * footer link to, and the one someone reaches without necessarily having
 * used the app yet.
 *
 * Two sections are deliberately modest rather than fictional:
 *
 * - Subscription: there is no billing integration in this codebase yet
 *   (pricing page's own price is still "to be confirmed"). Rather than
 *   mock up a plan-switcher or invented billing history against data that
 *   doesn't exist, this shows the one true thing — everyone is on the free
 *   plan today — and links to /pricing for what's coming.
 * - Sign-in: Supabase doesn't expose a per-device session list through the
 *   anon/authenticated API this app uses (only the Admin API, which is
 *   server-role-only and reachable solely from a background/admin
 *   context — see src/server/supabase/service-role-client.ts). So this
 *   shows what's actually knowable — the signed-in email — plus sign-out,
 *   rather than a device list this app cannot truthfully populate.
 */
export default async function AccountPage() {
  let email: string | null = null;
  let configured = true;
  let supabase: Awaited<ReturnType<typeof getSupabaseServerClient>> | undefined;

  try {
    supabase = await getSupabaseServerClient();
    const result = await supabase.auth.getUser();
    email = result.data.user?.email ?? null;
  } catch (error) {
    unstable_rethrow(error);
    reportError(error, { page: "account" });
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
    redirect(`/login?next=${encodeURIComponent("/account")}`);
  }

  const [profile, deletionRequest] = await Promise.all([
    getProfile(supabase!),
    getMyDeletionRequest(supabase!),
  ]);

  return (
    <div>
      <h1 className="text-xl font-semibold">Your account</h1>

      {deletionRequest?.status === "pending" ? (
        <div className="border-danger bg-danger/5 mt-4 rounded-md border p-4">
          <p className="text-danger text-sm font-medium">
            Account deletion scheduled for{" "}
            {new Date(deletionRequest.eraseAfter).toLocaleDateString(undefined, {
              dateStyle: "long",
            })}
          </p>
          <p className="text-ink-muted mt-1 text-sm">
            Everything still works until then. You can cancel any time before that date.
          </p>
          <Link href="/account/delete" className="text-danger mt-2 inline-block text-sm underline">
            Manage or cancel
          </Link>
        </div>
      ) : null}

      <section className="border-border mt-8 border-t pt-6">
        <h2 className="text-ink font-semibold">Profile</h2>
        <dl className="mt-3 grid gap-2 text-sm">
          <div className="flex gap-2">
            <dt className="text-ink-muted w-28 flex-none">Name</dt>
            <dd className="text-ink">
              {profile?.displayName ?? (
                <Link href="/onboarding" className="text-primary underline">
                  Finish setup
                </Link>
              )}
            </dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-ink-muted w-28 flex-none">Email</dt>
            <dd className="text-ink">{email}</dd>
          </div>
        </dl>
      </section>

      <section className="border-border mt-8 border-t pt-6">
        <h2 className="text-ink font-semibold">Plan</h2>
        <p className="text-ink-muted mt-1 text-sm">
          You&apos;re on the free plan. It holds unlimited people, notes and dates, with no time
          limit.
        </p>
        <Link href="/pricing" className="text-primary mt-2 inline-block text-sm underline">
          See what Noyala Quiet adds
        </Link>
      </section>

      <section className="border-border mt-8 border-t pt-6">
        <h2 className="text-ink font-semibold">Export your data</h2>
        <p className="text-ink-muted mt-1 text-sm">
          Download everything you&apos;ve saved, in a readable format, right away.
        </p>
        <div className="mt-3 flex flex-wrap gap-3 text-sm">
          <a href="/api/export/people" className="text-primary underline">
            People (CSV)
          </a>
          <a href="/api/export/people-vcard" className="text-primary underline">
            People (vCard)
          </a>
          <a href="/api/export/important-dates" className="text-primary underline">
            Important dates (CSV)
          </a>
          <a href="/api/export/memories" className="text-primary underline">
            Memories (CSV)
          </a>
        </div>
      </section>

      <section className="border-border mt-8 border-t pt-6">
        <h2 className="text-ink font-semibold">Signed in</h2>
        <p className="text-ink-muted mt-1 text-sm">Signed in as {email}.</p>
        <form action={signOutFromAccount} className="mt-3">
          <button
            type="submit"
            className="border-border rounded-md border px-4 py-2 text-sm font-medium"
          >
            Sign out
          </button>
        </form>
      </section>

      <section className="border-border mt-8 border-t pt-6">
        <h2 className="text-danger font-semibold">Delete account</h2>
        {deletionRequest?.status === "pending" ? (
          <p className="text-ink-muted mt-1 text-sm">
            Already scheduled — see above to manage or cancel it.
          </p>
        ) : (
          <>
            <p className="text-ink-muted mt-1 text-sm">
              Schedules removal of your account and everything in it, after a 30-day recovery
              window.
            </p>
            <Link
              href="/account/delete"
              className="border-danger text-danger mt-3 inline-block rounded-md border px-4 py-2 text-sm font-medium"
            >
              Delete account
            </Link>
          </>
        )}
      </section>
    </div>
  );
}
