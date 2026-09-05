import type { FollowUp } from "@noyala/domain";

export interface FollowUpRow {
  id: string;
  user_id: string;
  person_id: string;
  interaction_id: string | null;
  description: string;
  due_at: string | null;
  status: FollowUp["status"];
  created_at: string;
  updated_at: string;
}

export function toFollowUp(row: FollowUpRow): FollowUp {
  return {
    id: row.id,
    userId: row.user_id,
    personId: row.person_id,
    interactionId: row.interaction_id,
    description: row.description,
    dueAt: row.due_at,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
