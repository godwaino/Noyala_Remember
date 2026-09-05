/**
 * Minimal vCard 3.0 encoder for exporting people. No external dependency
 * for a format this small; only the fields Noyala actually stores.
 */
export interface VCardPerson {
  firstName: string;
  lastName?: string | null;
  nickname?: string | null;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
}

function escapeVCardText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

export function toVCard(person: VCardPerson): string {
  const fullName = [person.firstName, person.lastName].filter(Boolean).join(" ");
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${escapeVCardText(fullName)}`,
    `N:${escapeVCardText(person.lastName ?? "")};${escapeVCardText(person.firstName)};;;`,
  ];
  if (person.nickname) lines.push(`NICKNAME:${escapeVCardText(person.nickname)}`);
  if (person.phone) lines.push(`TEL:${escapeVCardText(person.phone)}`);
  if (person.email) lines.push(`EMAIL:${escapeVCardText(person.email)}`);
  if (person.notes) lines.push(`NOTE:${escapeVCardText(person.notes)}`);
  lines.push("END:VCARD");
  return lines.join("\r\n");
}

export function toVCardCollection(people: VCardPerson[]): string {
  return people.map(toVCard).join("\r\n") + "\r\n";
}
