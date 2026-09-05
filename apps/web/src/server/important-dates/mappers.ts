import type { ImportantDate } from "@noyala/domain";

export interface ImportantDateRow {
  id: string;
  user_id: string;
  person_id: string;
  type: ImportantDate["type"];
  label: string;
  month: number;
  day: number;
  year: number | null;
  recurs_annually: boolean;
  reminder_offsets: number[];
  timezone: string;
  created_at: string;
  updated_at: string;
}

export function toImportantDate(row: ImportantDateRow): ImportantDate {
  return {
    id: row.id,
    userId: row.user_id,
    personId: row.person_id,
    type: row.type,
    label: row.label,
    month: row.month,
    day: row.day,
    year: row.year,
    recursAnnually: row.recurs_annually,
    reminderOffsets: row.reminder_offsets,
    timezone: row.timezone,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
