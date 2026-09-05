import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getReconnectStatus, type Person } from "@noyala/domain";
import { listPeople } from "@/server/people/queries";
import { listLastInteractionByPerson } from "@/server/interactions/queries";

export interface ReconnectSuggestion {
  person: Person;
  daysSinceLastInteraction: number | null;
}

/** People with a reconnect cadence set who are due, not currently snoozed
 * — sorted longest-overdue first. No score or ranking is computed or
 * stored; this is just a filter + sort over plain facts. */
export async function listReconnectSuggestions(
  client: SupabaseClient,
  ownerUserId: string,
  now: Date,
): Promise<ReconnectSuggestion[]> {
  const [people, lastInteractionByPerson] = await Promise.all([
    listPeople(client, ownerUserId),
    listLastInteractionByPerson(client),
  ]);

  const suggestions: ReconnectSuggestion[] = [];
  for (const person of people) {
    const lastInteraction = lastInteractionByPerson.get(person.id);
    const status = getReconnectStatus(
      {
        cadenceDays: person.reconnectCadenceDays,
        lastInteractionAt: lastInteraction ? new Date(lastInteraction.occurredAt) : null,
        snoozedUntil: person.reconnectSnoozedUntil ? new Date(person.reconnectSnoozedUntil) : null,
      },
      now,
    );
    if (status.due) {
      suggestions.push({ person, daysSinceLastInteraction: status.daysSinceLastInteraction });
    }
  }

  return suggestions.sort(
    (a, b) => (b.daysSinceLastInteraction ?? Infinity) - (a.daysSinceLastInteraction ?? Infinity),
  );
}
