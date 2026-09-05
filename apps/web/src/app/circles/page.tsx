import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/server/supabase/server-client";
import { listMyCircles, listMyPendingInvitations } from "@/server/circles/queries";
import { acceptInvitation, declineInvitation } from "@/server/circles/actions";
import { EmptyState } from "@/components/EmptyState";
import { CreateCircleForm } from "@/components/CreateCircleForm";
import { AcceptInvitationButton } from "@/components/AcceptInvitationButton";

export const metadata: Metadata = { title: "Circles" };

export default async function CirclesPage() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [circles, invitations] = await Promise.all([
    listMyCircles(supabase),
    user.email ? listMyPendingInvitations(supabase, user.email) : Promise.resolve([]),
  ]);

  return (
    <div>
      <h1 className="text-xl font-semibold">Circles</h1>
      <p className="text-ink-muted mt-1 text-sm">
        Coordinate dates and gifts with family or a partner. Private memories stay private unless
        you explicitly share them.
      </p>

      {invitations.length > 0 ? (
        <section className="mt-6">
          <h2 className="text-ink font-semibold">Invitations</h2>
          <ul className="border-border divide-border mt-3 divide-y rounded-lg border">
            {invitations.map((invitation) => (
              <li key={invitation.id} className="flex items-center justify-between gap-4 p-4">
                <p className="text-ink text-sm">
                  Invited as <span className="font-medium capitalize">{invitation.role}</span>
                </p>
                <div className="flex shrink-0 items-start gap-2">
                  <AcceptInvitationButton action={acceptInvitation.bind(null, invitation.token)} />
                  <form action={declineInvitation.bind(null, invitation.id)}>
                    <button
                      type="submit"
                      className="border-border rounded-md border px-3 py-1.5 text-xs font-medium"
                    >
                      Decline
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-6">
        <h2 className="text-ink font-semibold">Your circles</h2>
        <div className="mt-3">
          {circles.length === 0 ? (
            <EmptyState
              title="No shared circles yet"
              description="Create one to start coordinating dates and gifts with family or a partner."
            />
          ) : (
            <ul className="border-border divide-border divide-y rounded-lg border">
              {circles.map((circle) => (
                <li key={circle.id} className="flex items-center justify-between gap-4 p-4">
                  <p className="text-ink text-sm font-medium">{circle.name}</p>
                  <Link
                    href={`/circles/${circle.id}`}
                    className="border-border rounded-md border px-3 py-1.5 text-xs font-medium"
                  >
                    Open
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
        <CreateCircleForm />
      </section>
    </div>
  );
}
