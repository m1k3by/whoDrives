import * as Calendar from 'expo-calendar/legacy';

import type { Database } from '@/types/database';

type EventRow = Database['public']['Tables']['events']['Row'];

// Hands appointments to the calendar app of the phone: it opens its own pre-filled
// "new event" screen, the person picks the calendar and saves. No calendar permission.

type Entry = Omit<Partial<Calendar.Event>, 'id'>;

/** One occurrence (absolute times from the server) */
export function occurrenceEntry(o: {
  title: string;
  location: string | null;
  startsAt: string;
  endsAt: string;
}): Entry {
  return {
    title: o.title,
    location: o.location ?? undefined,
    startDate: new Date(o.startsAt),
    endDate: new Date(o.endsAt),
  };
}

/**
 * A series as one repeating entry. The app only creates series on the weekday of the
 * first date, so "weekly from the first date" is the same rule (Android's dialog would
 * drop a BYDAY list anyway).
 */
export function seriesEntry(
  e: Pick<
    EventRow,
    | 'title'
    | 'location'
    | 'start_time'
    | 'duration_min'
    | 'rrule'
    | 'first_date'
    | 'until_date'
    | 'timezone'
  > & { childName?: string },
): Entry {
  // ponytail: wall time on this phone; right as long as phone and family share a time zone
  const [y, m, d] = e.first_date.split('-').map(Number);
  const [hh, mm] = e.start_time.split(':').map(Number);
  const start = new Date(y, m - 1, d, hh, mm);
  const end = new Date(start.getTime() + e.duration_min * 60_000);
  let recurrenceRule: Calendar.RecurrenceRule | undefined;
  if (e.rrule) {
    recurrenceRule = { frequency: Calendar.Frequency.WEEKLY };
    if (e.until_date) {
      const [uy, um, ud] = e.until_date.split('-').map(Number);
      recurrenceRule.endDate = new Date(uy, um - 1, ud, 23, 59);
    }
  }
  return {
    title: e.childName ? `${e.title} (${e.childName})` : e.title,
    location: e.location ?? undefined,
    startDate: start,
    endDate: end,
    timeZone: e.timezone,
    recurrenceRule,
  };
}

export async function addToPhoneCalendar(entry: Entry) {
  await Calendar.createEventInCalendarAsync(entry);
}
