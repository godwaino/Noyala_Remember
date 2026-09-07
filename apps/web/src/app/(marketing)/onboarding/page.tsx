import type { Metadata } from "next";
import { redirect, unstable_rethrow } from "next/navigation";
import { getSupabaseServerClient } from "@/server/supabase/server-client";
import { reportError } from "@/server/observability/error-monitoring";
import { EmptyState } from "@/components/EmptyState";
import { OnboardingForm } from "./OnboardingForm";

export const metadata: Metadata = { title: "Set up your account" };

export default async function OnboardingPage() {
  // `redirect()` throws a control-flow error Next.js relies on, so it must
  // never be called from inside this try/catch (which is here only to turn
  // a missing/misconfigured Supabase project into a friendly empty state).
  let user;
  try {
    const supabase = await getSupabaseServerClient();
    const result = await supabase.auth.getUser();
    user = result.data.user;
  } catch (error) {
    unstable_rethrow(error);
    reportError(error, { page: "onboarding" });
    return (
      <EmptyState
        title="Sign-in isn't configured yet"
        description="This environment doesn't have a Supabase project connected. See docs/roadmap.md for the setup steps."
      />
    );
  }

  if (!user) {
    redirect("/login");
  }

  return (
    <div>
      <h1 className="text-xl font-semibold">A few quick things</h1>
      <p className="text-ink-muted mt-1 text-sm">
        This helps us remind you at the right time, in the right tone.
      </p>
      <OnboardingForm displayNameHint={user.email?.split("@")[0]} />
    </div>
  );
}
