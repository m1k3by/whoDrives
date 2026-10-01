import type { Occurrence } from './hooks';
import { searchOccurrences } from './search';

const occ = (
  id: string,
  title: string,
  child: string,
  location: string | null,
  who: string | null,
) =>
  ({
    id,
    starts_at: '2026-10-06T13:00:00Z',
    ends_at: '2026-10-06T14:00:00Z',
    status: who ? 'claimed' : 'open',
    assigned_to: who ? `user-${who}` : null,
    profiles: who ? { display_name: who } : null,
    events: {
      title,
      kind: 'ride',
      location,
      event_children: [{ first_name: child, color: '#000000' }],
    },
  }) as Occurrence;

const items = [
  occ('1', 'Reiten', 'Lena', 'Reitstall Sonnenhof', 'Oma'),
  occ('2', 'Fußball', 'Max', 'Sportplatz', null),
  occ('3', 'Zahnarzt', 'Lena', null, 'Mama'),
];
const ids = (list: Occurrence[]) => list.map((o) => o.id);

test.each([
  ['reiten', ['1']],
  ['LENA', ['1', '3']],
  ['sonnenhof', ['1']],
  ['oma', ['1']],
  ['fahrt', ['1', '2', '3']], // kind label "Fahrt"
  ['lena mama', ['3']], // all words must match
  ['fußball', ['2']],
  ['ballett', []],
])('"%s" finds %j', (query, expected) => {
  expect(ids(searchOccurrences(items, query))).toEqual(expected);
});

test('empty query finds nothing (the screen shows a hint instead)', () => {
  expect(searchOccurrences(items, '   ')).toEqual([]);
});

test('an appointment for two children is found by either name', () => {
  const swim = occ('4', 'Schwimmen', 'Lena', null, null);
  swim.events!.event_children.push({ first_name: 'Max', color: '#000000' });
  expect(searchOccurrences([swim], 'max').map((o) => o.id)).toEqual(['4']);
  expect(searchOccurrences([swim], 'lena schwimmen').map((o) => o.id)).toEqual(['4']);
});
