import {
  calendarDateInTimeZone,
  getReconnectStatus,
  resolveUpcoming,
  type CalendarDate,
  type ImportantDate,
  type Person,
  type UpcomingDate,
} from "@noyala/domain";
import { listPeople } from "./people";
import { listImportantDatesForUser } from "./dates";
import { listLastInteractionByPerson, listOpenFollowUps } from "./interactions";
import type { FollowUp } from "@noyala/domain";

export interface UpcomingOccasion extends UpcomingDate<ImportantDate> {
  person: Person;
}

export interface ReconnectSuggestion {
  person: Person;
  daysSinceLastInteraction: number | null;
}

export interface HomeFeed {
  today: CalendarDate;
  upcoming: UpcomingOccasion[];
  reconnect: ReconnectSuggestion[];
  followUps: FollowUp[];
  peopleById: Map<string, Person>;
}

/**
 * Everything Home needs, computed the same way apps/web's
 * relationship-care/queries.ts and important-dates/upcoming.ts do — same
 * @noyala/domain pure functions, just called from a client that talks to
 * Supabase directly instead of through a Next.js server module.
 */
export async function loadHomeFeed(userId: string, timezone: string, now: Date): Promise<HomeFeed> {
  const [people, dates, lastInteractionByPerson, followUps] = await Promise.all([
    listPeople(userId),
    listImportantDatesForUser(userId),
    listLastInteractionByPerson(userId),
    listOpenFollowUps(userId),
  ]);

  const peopleById = new Map(people.map((p) => [p.id, p]));
  const today = calendarDateInTimeZone(now, timezone);

  const resolved = resolveUpcoming(dates, (d) => d, today);
  const upcoming: UpcomingOccasion[] = resolved
    .map((u) => {
      const person = peopleById.get(u.item.personId);
      return person ? { ...u, person } : null;
    })
    .filter((u): u is UpcomingOccasion => u !== null);

  const reconnect: ReconnectSuggestion[] = [];
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
      reconnect.push({ person, daysSinceLastInteraction: status.daysSinceLastInteraction });
    }
  }
  reconnect.sort((a, b) => (b.daysSinceLastInteraction ?? Infinity) - (a.daysSinceLastInteraction ?? Infinity));

  return { today, upcoming, reconnect, followUps, peopleById };
}
