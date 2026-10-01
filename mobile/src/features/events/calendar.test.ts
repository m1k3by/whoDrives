import { Frequency } from 'expo-calendar/legacy';

import { occurrenceEntry, seriesEntry } from './calendar';

const riding = {
  title: 'Reiten',
  location: 'Reitstall Sonnenhof',
  start_time: '15:00:00',
  duration_min: 90,
  rrule: 'FREQ=WEEKLY;BYDAY=TU',
  first_date: '2026-10-06',
  until_date: '2027-03-30',
  timezone: 'Europe/Berlin',
  childName: 'Lena',
};

test('series: weekly from the first date at the start time, until the end of the last day', () => {
  const entry = seriesEntry(riding);
  expect(entry.title).toBe('Reiten (Lena)');
  expect(entry.location).toBe('Reitstall Sonnenhof');
  expect(entry.startDate).toEqual(new Date(2026, 9, 6, 15, 0));
  expect(entry.endDate).toEqual(new Date(2026, 9, 6, 16, 30));
  expect(entry.timeZone).toBe('Europe/Berlin');
  expect(entry.recurrenceRule).toEqual({
    frequency: Frequency.WEEKLY,
    endDate: new Date(2027, 2, 30, 23, 59),
  });
});

test('series without end repeats open-ended; a one-off appointment does not repeat', () => {
  expect(seriesEntry({ ...riding, until_date: null }).recurrenceRule).toEqual({
    frequency: Frequency.WEEKLY,
  });
  expect(seriesEntry({ ...riding, rrule: null }).recurrenceRule).toBeUndefined();
});

test('single occurrence keeps the exact times from the server', () => {
  const entry = occurrenceEntry({
    title: 'Reiten (Lena)',
    location: null,
    startsAt: '2026-10-06T13:00:00Z',
    endsAt: '2026-10-06T14:30:00Z',
  });
  expect(entry.startDate).toEqual(new Date('2026-10-06T13:00:00Z'));
  expect(entry.endDate).toEqual(new Date('2026-10-06T14:30:00Z'));
  expect(entry.location).toBeUndefined();
});
