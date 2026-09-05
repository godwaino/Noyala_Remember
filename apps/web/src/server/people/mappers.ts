import type { Person } from "@noyala/domain";

/** Row shape as returned by Supabase (snake_case) for the `people` table. */
export interface PersonRow {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string | null;
  nickname: string | null;
  relationship_type: Person["relationshipType"];
  phone: string | null;
  email: string | null;
  pronouns: string | null;
  notes: string | null;
  reconnect_cadence_days: number | null;
  reconnect_snoozed_until: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export function toPerson(row: PersonRow): Person {
  return {
    id: row.id,
    userId: row.user_id,
    firstName: row.first_name,
    lastName: row.last_name,
    nickname: row.nickname,
    relationshipType: row.relationship_type,
    phone: row.phone,
    email: row.email,
    pronouns: row.pronouns,
    notes: row.notes,
    reconnectCadenceDays: row.reconnect_cadence_days,
    reconnectSnoozedUntil: row.reconnect_snoozed_until,
    archivedAt: row.archived_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Empty-string form fields mean "not provided" — store as null, not "". */
export function blankToNull(value: string | undefined): string | null {
  return value && value.trim().length > 0 ? value.trim() : null;
}
