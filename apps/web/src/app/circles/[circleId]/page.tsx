import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { canManageInvitations, canRemoveMember } from "@noyala/domain";
import { getSupabaseServerClient } from "@/server/supabase/server-client";
import {
  getCircle,
  getMyMembership,
  listCircleInvitations,
  listCircleMembers,
} from "@/server/circles/queries";
import {
  inviteToCircle,
  leaveCircle,
  removeMember,
  revokeInvitation,
  setLinkedPerson,
} from "@/server/circles/actions";
import { listActiveSharesForCircle } from "@/server/person-shares/queries";
import { EmptyState } from "@/components/EmptyState";
import { InviteToCircleForm } from "@/components/InviteToCircleForm";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";

export const metadata: Metadata = { title: "Circle" };

export default async function CircleDetailPage({
  params,
}: {
  params: Promise<{ circleId: string }>;
}) {
  const { circleId } = await params;
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const circle = await getCircle(supabase, circleId);
  if (!circle) notFound();

  const [membership, members, shares] = await Promise.all([
    getMyMembership(supabase, circleId, user.id),
    listCircleMembers(supabase, circleId),
    listActiveSharesForCircle(supabase, circleId),
  ]);

  // The owner is always able to manage even in the rare case their own
  // membership row failed to insert at creation time (see createCircle).
  const myRole = membership?.role ?? (circle.ownerUserId === user.id ? "owner" : "viewer");
  const isManager = canManageInvitations(myRole);

  const invitations = isManager ? await listCircleInvitations(supabase, circleId) : [];

  const sharedPersonIds = shares.map((s) => s.personId);
  const { data: sharedPeople } = sharedPersonIds.length
    ? await supabase.from("people").select("id, first_name, last_name").in("id", sharedPersonIds)
    : { data: [] as { id: string; first_name: string; last_name: string | null }[] };
  const personNameById = new Map(
    (sharedPeople ?? []).map((p) => [p.id, `${p.first_name} ${p.last_name ?? ""}`.trim()]),
  );

  return (
    <div>
      <h1 className="text-xl font-semibold">{circle.name}</h1>
      <p className="text-ink-muted mt-1 text-sm capitalize">Your role: {myRole}</p>

      <section className="mt-6">
        <h2 className="text-ink font-semibold">Members</h2>
        <ul className="border-border divide-border mt-3 divide-y rounded-lg border">
          {members.map((member) => (
            <li key={member.id} className="flex items-center justify-between gap-4 p-4">
              <p className="text-ink text-sm">
                <span className="capitalize">{member.role}</span>
                {member.userId === user.id ? (
                  <span className="text-ink-muted"> · you</span>
                ) : null}
              </p>
              {canRemoveMember(myRole, member.userId === user.id) ? (
                member.userId === user.id ? (
                  <form action={leaveCircle.bind(null, circleId)}>
                    <ConfirmSubmitButton
                      confirmMessage="Leave this circle? You'll lose access to anything shared here."
                      className="border-border rounded-md border px-3 py-1.5 text-xs font-medium"
                    >
                      Leave
                    </ConfirmSubmitButton>
                  </form>
                ) : (
                  <form action={removeMember.bind(null, circleId, member.id)}>
                    <ConfirmSubmitButton
                      confirmMessage="Remove this member? This immediately revokes their access."
                      className="border-border text-danger rounded-md border px-3 py-1.5 text-xs font-medium"
                    >
                      Remove
                    </ConfirmSubmitButton>
                  </form>
                )
              ) : null}
            </li>
          ))}
        </ul>

        {sharedPersonIds.length > 0 ? (
          <form
            action={async (formData: FormData) => {
              "use server";
              const value = formData.get("linkedPersonId");
              await setLinkedPerson(circleId, typeof value === "string" && value ? value : null);
            }}
            className="border-border mt-3 flex flex-wrap items-end gap-3 rounded-lg border p-4"
          >
            <div className="flex flex-1 flex-col gap-1">
              <label htmlFor="linkedPersonId" className="text-sm font-medium">
                Which shared person is you?
              </label>
              <p className="text-ink-muted text-xs">
                Hides any gift ideas planned for that person from your own view.
              </p>
              <select
                id="linkedPersonId"
                name="linkedPersonId"
                defaultValue={membership?.linkedPersonId ?? ""}
                className="border-border rounded-md border px-3 py-2 text-sm"
              >
                <option value="">None</option>
                {sharedPersonIds.map((id) => (
                  <option key={id} value={id}>
                    {personNameById.get(id) ?? id}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="border-border rounded-md border px-4 py-2 text-sm font-medium"
            >
              Save
            </button>
          </form>
        ) : null}
      </section>

      {isManager ? (
        <section className="mt-6">
          <h2 className="text-ink font-semibold">Invitations</h2>
          <div className="mt-3">
            {invitations.filter((i) => i.status === "pending").length === 0 ? (
              <EmptyState title="No pending invitations" description="Invite someone below." />
            ) : (
              <ul className="border-border divide-border divide-y rounded-lg border">
                {invitations
                  .filter((i) => i.status === "pending")
                  .map((invitation) => (
                    <li key={invitation.id} className="flex items-center justify-between gap-4 p-4">
                      <p className="text-ink text-sm">
                        {invitation.invitedEmail}{" "}
                        <span className="text-ink-muted capitalize">({invitation.role})</span>
                      </p>
                      <form action={revokeInvitation.bind(null, circleId, invitation.id)}>
                        <button
                          type="submit"
                          className="border-border rounded-md border px-3 py-1.5 text-xs font-medium"
                        >
                          Revoke
                        </button>
                      </form>
                    </li>
                  ))}
              </ul>
            )}
          </div>
          <InviteToCircleForm action={inviteToCircle.bind(null, circleId)} />
        </section>
      ) : null}

      <section className="mt-6">
        <h2 className="text-ink font-semibold">Shared people</h2>
        <div className="mt-3">
          {shares.length === 0 ? (
            <EmptyState
              title="No one shared yet"
              description="Share one of your people from their detail page to plan gifts and coordinate dates here."
            />
          ) : (
            <ul className="border-border divide-border divide-y rounded-lg border">
              {shares.map((share) => (
                <li key={share.id} className="flex items-center justify-between gap-4 p-4">
                  <p className="text-ink text-sm">{personNameById.get(share.personId) ?? "Someone"}</p>
                  <p className="text-ink-muted text-xs">
                    {share.shareMemories ? "Memories shared" : "Memories private"} ·{" "}
                    {share.shareGiftPlanning ? "Gift planning on" : "Gift planning off"}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
