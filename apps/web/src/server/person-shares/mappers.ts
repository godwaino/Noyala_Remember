import type { PersonShare } from "@noyala/domain";

export interface PersonShareRow {
  id: string;
  owner_user_id: string;
  person_id: string;
  circle_id: string;
  share_memories: boolean;
  share_gift_planning: boolean;
  created_at: string;
  revoked_at: string | null;
}

export function toPersonShare(row: PersonShareRow): PersonShare {
  return {
    id: row.id,
    ownerUserId: row.owner_user_id,
    personId: row.person_id,
    circleId: row.circle_id,
    shareMemories: row.share_memories,
    shareGiftPlanning: row.share_gift_planning,
    createdAt: row.created_at,
    revokedAt: row.revoked_at,
  };
}
