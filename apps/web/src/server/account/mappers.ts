import type { AccountDeletionRequest } from "@noyala/domain";

export interface AccountDeletionRequestRow {
  user_id: string;
  status: AccountDeletionRequest["status"];
  reason: string | null;
  requested_at: string;
  erase_after: string;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
}

export function toAccountDeletionRequest(row: AccountDeletionRequestRow): AccountDeletionRequest {
  return {
    userId: row.user_id,
    status: row.status,
    reason: row.reason,
    requestedAt: row.requested_at,
    eraseAfter: row.erase_after,
    cancelledAt: row.cancelled_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
