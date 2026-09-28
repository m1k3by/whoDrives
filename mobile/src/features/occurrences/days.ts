import { t } from '@/ui/strings';

import { dayKey } from './month';

const pad = (n: number) => String(n).padStart(2, '0');

/** "Heute", "Morgen" or "Dienstag, 06.10." (device local time) */
export function dayLabel(date: Date, now: Date): string {
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  if (dayKey(date) === dayKey(now)) return t.occurrences.today;
  if (dayKey(date) === dayKey(tomorrow)) return t.occurrences.tomorrow;
  return `${t.events.weekdays[date.getDay()]}, ${pad(date.getDate())}.${pad(date.getMonth() + 1)}.`;
}

export const timeLabel = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

/** Groups items (sorted by start) into consecutive days. */
export function groupByDay<T extends { starts_at: string }>(
  items: T[],
  now: Date,
): { label: string; items: T[] }[] {
  const groups: { key: string; label: string; items: T[] }[] = [];
  for (const item of items) {
    const start = new Date(item.starts_at);
    const key = dayKey(start);
    if (groups.at(-1)?.key !== key) groups.push({ key, label: dayLabel(start, now), items: [] });
    groups.at(-1)!.items.push(item);
  }
  return groups;
}
