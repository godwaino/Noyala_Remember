import type { Circle, CircleInvitation, CircleMember } from "@noyala/domain";

export interface CircleRow {
  id: string;
  owner_user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export function toCircle(row: CircleRow): Circle {
  return {
    id: row.id,
    ownerUserId: row.owner_user_id,
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface CircleMemberRow {
  id: string;
  circle_id: string;
  user_id: string;
  role: CircleMember["role"];
  linked_person_id: string | null;
  created_at: string;
}

export function toCircleMember(row: CircleMemberRow): CircleMember {
  return {
    id: row.id,
    circleId: row.circle_id,
    userId: row.user_id,
    role: row.role,
    linkedPersonId: row.linked_person_id,
    createdAt: row.created_at,
  };
}

export interface CircleInvitationRow {
  id: string;
  circle_id: string;
  invited_email: string;
  invited_by_user_id: string;
  role: CircleInvitation["role"];
  token: string;
  status: CircleInvitation["status"];
  created_at: string;
  responded_at: string | null;
}

export function toCircleInvitation(row: CircleInvitationRow): CircleInvitation {
  return {
    id: row.id,
    circleId: row.circle_id,
    invitedEmail: row.invited_email,
    invitedByUserId: row.invited_by_user_id,
    role: row.role,
    token: row.token,
    status: row.status,
    createdAt: row.created_at,
    respondedAt: row.responded_at,
  };
}
