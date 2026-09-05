import type { GiftIdea } from "@noyala/domain";

export interface GiftIdeaRow {
  id: string;
  circle_id: string;
  person_id: string;
  created_by_user_id: string;
  title: string;
  description: string | null;
  occasion: string | null;
  budget_amount: number | null;
  budget_currency: string | null;
  deadline_at: string | null;
  link_url: string | null;
  status: GiftIdea["status"];
  claimed_by_user_id: string | null;
  created_at: string;
  updated_at: string;
}

export function toGiftIdea(row: GiftIdeaRow): GiftIdea {
  return {
    id: row.id,
    circleId: row.circle_id,
    personId: row.person_id,
    createdByUserId: row.created_by_user_id,
    title: row.title,
    description: row.description,
    occasion: row.occasion,
    budgetAmount: row.budget_amount,
    budgetCurrency: row.budget_currency,
    deadlineAt: row.deadline_at,
    linkUrl: row.link_url,
    status: row.status,
    claimedByUserId: row.claimed_by_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
