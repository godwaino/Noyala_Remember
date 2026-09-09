import type { Metadata } from "next";
import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import type { CircleInvitationLookup } from "@noyala/domain";
import { brand } from "@noyala/brand";
import { EmptyState } from "@/components/EmptyState";
import { getSupabaseServerClient } from "@/server/supabase/server-client";
import { getInvitationByToken } from "@/server/circles/queries";
import { reportError } from "@/server/observability/error-monitoring";
import { InviteResponse } from "./InviteResponse";

export const metadata: Metadata = { title: "Circle invitation" };

/** Reveals only the first character and the domain — the invited email is
 * already visible to whoever holds this link, but there's no reason to
 * render it in full on a page that needs no sign-in to view. */
function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain || !local) return email;
  return `${local[0]}${"*".repeat(Math.max(local.length - 1, 1))}@${domain}`;
}

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  let viewerEmail: string | null = null;
  let configured = true;
  let supabase: Awaited<ReturnType<typeof getSupabaseServerClient>> | undefined;

  try {
    supabase = await getSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    viewerEmail = user?.email ?? null;
  } catch (error) {
    unstable_rethrow(error);
    reportError(error, { page: "invite", token });
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

  // A lookup failure here (a genuine DB error, not a missing token — that
  // comes back as state: "invalid" from the RPC itself) is treated the
  // same as an invalid link rather than surfaced as a distinct error
  // state: from the visitor's side there's nothing actionable either way.
  let invitation: CircleInvitationLookup;
  try {
    invitation = await getInvitationByToken(supabase!, token);
  } catch (error) {
    unstable_rethrow(error);
    reportError(error, { page: "invite", token, action: "getInvitationByToken" });
    invitation = { state: "invalid", circleName: null, invitedEmail: null, role: null, expiresAt: null };
  }

  if (invitation.state === "invalid") {
    return (
      <div>
        <h1 className="text-xl font-semibold">This isn&apos;t a real invitation link</h1>
        <p className="text-ink-muted mt-2 text-sm">
          Double-check the link, or ask whoever invited you to send a new one.
        </p>
      </div>
    );
  }

  if (invitation.state === "expired") {
    return (
      <div>
        <h1 className="text-xl font-semibold">This invitation has expired</h1>
        <p className="text-ink-muted mt-2 text-sm">
          Invitations to {invitation.circleName} are only valid for a little while. Ask whoever
          invited you to send a new one.
        </p>
      </div>
    );
  }

  if (invitation.state === "withdrawn") {
    return (
      <div>
        <h1 className="text-xl font-semibold">This invitation is no longer available</h1>
        <p className="text-ink-muted mt-2 text-sm">
          It was withdrawn or declined. Ask whoever invited you to send a new one if this was a
          mistake.
        </p>
      </div>
    );
  }

  if (invitation.state === "accepted") {
    return (
      <div>
        <h1 className="text-xl font-semibold">Already accepted</h1>
        <p className="text-ink-muted mt-2 text-sm">
          This invitation to {invitation.circleName} has already been accepted.
        </p>
        <Link href="/app/circles" className="text-primary mt-3 inline-block text-sm underline">
          Go to your circles
        </Link>
      </div>
    );
  }

  // state === "valid" from here on.
  const emailMatches =
    viewerEmail && invitation.invitedEmail
      ? viewerEmail.toLowerCase() === invitation.invitedEmail.toLowerCase()
      : false;

  return (
    <div>
      <h1 className="text-xl font-semibold">
        You&apos;re invited to {invitation.circleName} on {brand.name}
      </h1>
      <p className="text-ink-muted mt-2 text-sm">
        As {invitation.role === "organiser" ? "an organiser" : "a viewer"}, sent to{" "}
        {invitation.invitedEmail ? maskEmail(invitation.invitedEmail) : "you"}.
      </p>

      {!viewerEmail ? (
        <div className="mt-6">
          <Link
            href={`/login?next=${encodeURIComponent(`/invite/${token}`)}`}
            className="bg-primary text-surface inline-block rounded-md px-4 py-2 text-sm font-medium"
          >
            Sign in to respond
          </Link>
        </div>
      ) : !emailMatches ? (
        <p className="text-danger mt-4 text-sm">
          You&apos;re signed in as {viewerEmail}, but this invitation was sent to a different
          address. Sign out and sign in with the invited email to respond.
        </p>
      ) : (
        <InviteResponse token={token} />
      )}
    </div>
  );
}
