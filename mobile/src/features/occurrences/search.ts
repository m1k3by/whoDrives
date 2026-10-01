import { childNames } from '@/features/events/form';
import { t } from '@/ui/strings';

import type { Occurrence } from './hooks';

/**
 * Occurrences matching all words of the query (any order, case-insensitive) in title,
 * child, place, kind or the name of the person who took it.
 */
export function searchOccurrences(items: Occurrence[], query: string): Occurrence[] {
  const words = query.toLocaleLowerCase('de-DE').split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  return items.filter((o) => {
    const text = [
      o.events?.title,
      childNames(o.events?.event_children),
      o.events?.location,
      o.events ? t.events.kinds[o.events.kind] : null,
      o.profiles?.display_name,
    ]
      .filter(Boolean)
      .join(' ')
      .toLocaleLowerCase('de-DE');
    return words.every((w) => text.includes(w));
  });
}
