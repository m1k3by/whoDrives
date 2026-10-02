import { readPrefill, toPrefill, type ParsedEvent } from './voice';

jest.mock('@/lib/supabase', () => ({ supabase: {} }));

const children = [
  { id: 'child-lena', first_name: 'Lena' },
  { id: 'child-tom', first_name: 'Tom' },
];

const parsed: ParsedEvent = {
  title: 'Reiten',
  kind: 'ride',
  children: ['lena', 'Tom', 'Lena', 'Max'],
  location: 'Reitstall Sonnenhof',
  weekly: true,
  firstDate: '2026-10-06',
  untilDate: '2027-03-30',
  time: '15:00',
  durationMin: 90,
};

test('understood sentence becomes form values; names map to the family children', () => {
  expect(toPrefill(parsed, children)).toEqual({
    title: 'Reiten',
    kind: 'ride',
    childIds: ['child-lena', 'child-tom'], // case does not matter, twice once, unknown Max ignored
    location: 'Reitstall Sonnenhof',
    weekly: true,
    firstDate: '2026-10-06',
    untilDate: '2027-03-30',
    time: '15:00',
    durationMin: '90',
  });
});

test('malformed or missing values stay empty for the person to fill in', () => {
  const prefill = toPrefill(
    {
      ...parsed,
      kind: 'party',
      firstDate: 'nächsten Dienstag',
      time: '25:00',
      durationMin: 0,
      weekly: false,
      children: [],
    },
    children,
  );
  expect(prefill).toEqual({
    title: 'Reiten',
    location: 'Reitstall Sonnenhof',
    weekly: false,
    childIds: [],
  });
});

test('route parameter: unreadable input is ignored', () => {
  expect(readPrefill('{"title":"Reiten"}')).toEqual({ title: 'Reiten' });
  expect(readPrefill('kaputt')).toEqual({});
  expect(readPrefill(undefined)).toEqual({});
});
