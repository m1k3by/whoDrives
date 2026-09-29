import { filterOccurrences } from './filter';

const now = new Date('2026-10-06T10:00:00Z');
const later = '2026-10-06T14:00:00Z';
const items = [
  { id: 'open', status: 'open', assigned_to: null, ends_at: later },
  { id: 'open-over', status: 'open', assigned_to: null, ends_at: '2026-10-06T08:00:00Z' },
  { id: 'oma', status: 'claimed', assigned_to: 'oma', ends_at: later },
  { id: 'mama', status: 'claimed', assigned_to: 'mama', ends_at: later },
  { id: 'cancelled', status: 'cancelled', assigned_to: 'oma', ends_at: later },
  { id: 'former', status: 'claimed', assigned_to: null, ends_at: later },
];
const ids = (list: { id: string }[]) => list.map((o) => o.id);

test('all shows everything, including cancelled and past', () => {
  expect(ids(filterOccurrences(items, 'all', 'oma', now))).toEqual(ids(items));
});

test('open shows only what still needs someone and is not over', () => {
  expect(ids(filterOccurrences(items, 'open', 'oma', now))).toEqual(['open']);
});

test('mine shows what I took over, not cancelled ones', () => {
  expect(ids(filterOccurrences(items, 'mine', 'oma', now))).toEqual(['oma']);
  expect(ids(filterOccurrences(items, 'mine', 'mama', now))).toEqual(['mama']);
});

test('mine is empty without a user id (never matches claims of deleted accounts)', () => {
  expect(filterOccurrences(items, 'mine', undefined, now)).toEqual([]);
});
