import type { Memory } from "@noyala/domain";

export interface MemoryRow {
  id: string;
  user_id: string;
  person_id: string;
  content: string;
  category: Memory["category"];
  occurred_on: string | null;
  sensitivity: Memory["sensitivity"];
  source: "manual";
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export function toMemory(row: MemoryRow): Memory {
  return {
    id: row.id,
    userId: row.user_id,
    personId: row.person_id,
    content: row.content,
    category: row.category,
    occurredOn: row.occurred_on,
    sensitivity: row.sensitivity,
    source: row.source,
    archivedAt: row.archived_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
