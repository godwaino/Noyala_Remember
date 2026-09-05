import type { Interaction } from "@noyala/domain";

export interface InteractionRow {
  id: string;
  user_id: string;
  person_id: string;
  type: Interaction["type"];
  occurred_at: string;
  summary: string | null;
  source: "manual";
  created_at: string;
  updated_at: string;
}

export function toInteraction(row: InteractionRow): Interaction {
  return {
    id: row.id,
    userId: row.user_id,
    personId: row.person_id,
    type: row.type,
    occurredAt: row.occurred_at,
    summary: row.summary,
    source: row.source,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
