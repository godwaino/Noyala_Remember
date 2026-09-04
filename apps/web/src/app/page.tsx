import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import { brand } from "@noyala/brand";
import { EmptyState } from "@/components/EmptyState";
import { getSupabaseServerClient } from "@/server/supabase/server-client";
import { reportError } from "@/server/observability/error-monitoring";

export default async function HomePage() {
  let user;
  try {
    const supabase = await getSupabaseServerClient();
    const result = await supabase.auth.getUser();
    user = result.data.user;
  } catch (error) {
    // Next's own dynamic-rendering bailout (triggered by cookies() during a
    // static-generation attempt) surfaces as a thrown error here too; let
    // it propagate instead of misreporting it as a config problem.
    unstable_rethrow(error);
    reportError(error, { page: "home" });
    return (
      <EmptyState
        title="Sign-in isn't configured yet"
        description="This environment doesn't have a Supabase project connected. See docs/roadmap.md for the setup steps."
      />
    );
  }

  if (!user) {
    return (
      <div>
        <h1 className="text-xl font-semibold">{brand.tagline}</h1>
        <p className="text-ink-muted mt-2 text-sm">{brand.positioning}</p>
        <Link
          href="/login"
          className="bg-primary text-surface mt-6 inline-block rounded-md px-4 py-2 text-sm font-medium"
        >
          Sign in to get started
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-xl font-semibold">Welcome back</h1>
      <div className="mt-4">
        <EmptyState
          title="Your dashboard is coming soon"
          description="People, important dates and reminders land in the next build stage. If you haven't finished setup yet, visit Settings to complete onboarding."
        />
      </div>
    </div>
  );
}
