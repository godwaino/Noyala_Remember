import type { Metadata } from "next";
import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import { EmptyState } from "@/components/EmptyState";
import { getSupabaseServerClient } from "@/server/supabase/server-client";
import { reportError } from "@/server/observability/error-monitoring";
import { DeleteAccountForm } from "@/components/DeleteAccountForm";
import { PushSubscribeButton } from "@/components/PushSubscribeButton";
import { NotificationDeliveryList } from "@/components/NotificationDeliveryList";
import { NotificationPreferencesForm } from "@/components/NotificationPreferencesForm";
import { listNotificationDeliveries } from "@/server/notifications/queries";
import { getProfile } from "@/server/profile/queries";
import { signOut } from "./actions";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  let email: string | null = null;
  let configured = true;
  let supabase: Awaited<ReturnType<typeof getSupabaseServerClient>> | undefined;

  try {
    supabase = await getSupabaseServerClient();
    const result = await supabase.auth.getUser();
    email = result.data.user?.email ?? null;
  } catch (error) {
    unstable_rethrow(error);
    reportError(error, { page: "settings" });
    configured = false;
  }

  if (!configured) {
    return (
      <div>
        <h1 className="text-xl font-semibold">Settings</h1>
        <div className="mt-4">
          <EmptyState
            title="Sign-in isn't configured yet"
            description="This environment doesn't have a Supabase project connected. See docs/roadmap.md for the setup steps."
          />
        </div>
      </div>
    );
  }

  if (!email) {
    return (
      <div>
        <h1 className="text-xl font-semibold">Settings</h1>
        <p className="text-ink-muted mt-2 text-sm">
          <Link href="/login" className="text-primary underline">
            Sign in
          </Link>{" "}
          to manage your account.
        </p>
      </div>
    );
  }

  const [deliveries, profile] = await Promise.all([
    listNotificationDeliveries(supabase!),
    getProfile(supabase!),
  ]);

  return (
    <div>
      <h1 className="text-xl font-semibold">Settings</h1>
      <p className="text-ink-muted mt-2 text-sm">Signed in as {email}.</p>
      <form action={signOut} className="mt-6">
        <button
          type="submit"
          className="border-border rounded-md border px-4 py-2 text-sm font-medium"
        >
          Sign out
        </button>
      </form>

      <section className="border-border mt-10 border-t pt-6">
        <h2 className="text-ink font-semibold">Notifications</h2>
        <p className="text-ink-muted mt-1 text-sm">
          Choose how and when you want to hear about upcoming dates.
        </p>
        {profile ? (
          <NotificationPreferencesForm profile={profile} />
        ) : (
          <p className="text-ink-muted mt-3 text-sm">
            Finish <Link href="/onboarding" className="text-primary underline">setup</Link> to set
            notification preferences.
          </p>
        )}
        <div className="border-border mt-6 border-t pt-6">
          <p className="text-ink-muted text-sm">
            Push notifications for upcoming dates, delivered by your browser.
          </p>
          <div className="mt-3">
            <PushSubscribeButton vapidPublicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null} />
          </div>
        </div>
        <div className="mt-6">
          <NotificationDeliveryList deliveries={deliveries} />
        </div>
      </section>

      <section className="border-border mt-10 border-t pt-6">
        <h2 className="text-ink font-semibold">Export your data</h2>
        <p className="text-ink-muted mt-1 text-sm">
          Download everything you&apos;ve saved, in a readable format.
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

      <section className="border-border mt-10 border-t pt-6">
        <h2 className="text-danger font-semibold">Delete account</h2>
        <p className="text-ink-muted mt-1 text-sm">
          Permanently deletes your account and everything in it — people,
          dates, memories and message history. This can&apos;t be undone.
        </p>
        <DeleteAccountForm />
      </section>
    </div>
  );
}
