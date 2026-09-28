import type { Database } from '@/types/database';
import { t } from '@/ui/strings';

export type EventKind = Database['public']['Enums']['event_kind'];
type EventInsert = Database['public']['Tables']['events']['Insert'];
type EventRow = Database['public']['Tables']['events']['Row'];

// Index = Date.getUTCDay() (0 = Sunday)
const RRULE_DAYS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'] as const;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** "9:30" or "9.30" -> "09:30"; null if invalid */
export function parseTime(input: string): string | null {
  const m = /^(\d{1,2})[:.](\d{2})$/.exec(input.trim());
  if (!m) return null;
  const [h, min] = [Number(m[1]), Number(m[2])];
  if (h > 23 || min > 59) return null;
  return `${String(h).padStart(2, '0')}:${m[2]}`;
}

const dayIndex = (isoDate: string) => new Date(`${isoDate}T00:00:00Z`).getUTCDay();

export type EventForm = {
  title: string;
  kind: EventKind;
  childId: string | null;
  location: string;
  weekly: boolean;
  /** "YYYY-MM-DD" from the date picker, '' = not chosen */
  firstDate: string;
  untilDate: string;
  time: string;
  durationMin: string;
};

export type FormError = keyof typeof t.events.errors;

export function toEventInsert(
  form: EventForm,
  familyId: string,
): { ok: true; value: EventInsert } | { ok: false; error: FormError } {
  if (!form.title.trim()) return { ok: false, error: 'title' };
  if (!form.childId) return { ok: false, error: 'child' };
  const firstDate = form.firstDate;
  if (!ISO_DATE.test(firstDate)) return { ok: false, error: 'date' };
  const time = parseTime(form.time);
  if (!time) return { ok: false, error: 'time' };
  const duration = Number(form.durationMin);
  if (!Number.isInteger(duration) || duration < 5 || duration > 1440) {
    return { ok: false, error: 'duration' };
  }
  const untilDate = form.weekly && ISO_DATE.test(form.untilDate) ? form.untilDate : null;
  if (untilDate && untilDate < firstDate) return { ok: false, error: 'untilBeforeFirst' };
  return {
    ok: true,
    value: {
      family_id: familyId,
      child_id: form.childId,
      title: form.title.trim(),
      kind: form.kind,
      location: form.location.trim() || null,
      start_time: time,
      duration_min: duration,
      rrule: form.weekly ? `FREQ=WEEKLY;BYDAY=${RRULE_DAYS[dayIndex(firstDate)]}` : null,
      first_date: firstDate,
      until_date: untilDate,
    },
  };
}

const germanDate = (isoDate: string) => isoDate.split('-').reverse().join('.');

/** "Jeden Dienstag, 15:00 Uhr (ab 06.10.2026)" or "Einmalig am 08.10.2026, 09:30 Uhr" */
export function describeSchedule(
  e: Pick<EventRow, 'rrule' | 'first_date' | 'until_date' | 'start_time'>,
): string {
  const time = e.start_time.slice(0, 5);
  if (!e.rrule) return t.events.once(germanDate(e.first_date), time);
  const days = e.rrule
    .replace('FREQ=WEEKLY;BYDAY=', '')
    .split(',')
    .map((d) => t.events.weekdays[RRULE_DAYS.indexOf(d as (typeof RRULE_DAYS)[number])]);
  return t.events.weekly(
    days.join(', '),
    time,
    germanDate(e.first_date),
    e.until_date ? germanDate(e.until_date) : null,
  );
}
