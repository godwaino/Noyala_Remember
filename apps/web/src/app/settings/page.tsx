import type { Metadata } from "next";
import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import { EmptyState } from "@/components/EmptyState";
import { getSupabaseServerClient } from "@/server/supabase/server-client";
import { reportError } from "@/server/observability/error-monitoring";
import { signOut } from "./actions";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  let email: string | null = null;
  let configured = true;

  try {
    const supabase = await getSupabaseServerClient();
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

  return (
    <div>
      <h1 className="text-xl font-semibold">Settings</h1>
      <p className="text-ink-muted mt-2 text-sm">Signed in as {email}.</p>
      <p className="text-ink-muted mt-4 text-sm">
        Reminder preferences, tone defaults and privacy controls arrive in
        later build stages.
      </p>
      <form action={signOut} className="mt-6">
        <button
          type="submit"
          className="border-border rounded-md border px-4 py-2 text-sm font-medium"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}
