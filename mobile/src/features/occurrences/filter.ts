export type OccurrenceFilter = 'all' | 'open' | 'mine';

type Filterable = { status: string; assigned_to: string | null; ends_at: string };

/**
 * all:  everything, also cancelled and past (everybody sees everything)
 * open: still needs someone and not over yet
 * mine: taken over by me
 */
export function filterOccurrences<T extends Filterable>(
  items: T[],
  filter: OccurrenceFilter,
  myId: string | undefined,
  now: Date,
): T[] {
  if (filter === 'open') {
    return items.filter((o) => o.status === 'open' && new Date(o.ends_at) > now);
  }
  if (filter === 'mine') {
    return items.filter((o) => o.status === 'claimed' && !!myId && o.assigned_to === myId);
  }
  return items;
}
