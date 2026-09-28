import {
  describeSchedule,
  parseGermanDate,
  parseTime,
  toEventInsert,
  type EventForm,
} from './form';

test.each([
  ['6.10.2026', '2026-10-06'],
  ['06.10.2026', '2026-10-06'],
  ['29.02.2028', '2028-02-29'],
  ['29.02.2027', null],
  ['31.04.2026', null],
  ['2026-10-06', null],
  ['', null],
])('parseGermanDate(%s) = %s', (input, expected) => {
  expect(parseGermanDate(input)).toBe(expected);
});

test.each([
  ['15:00', '15:00'],
  ['9:30', '09:30'],
  ['9.30', '09:30'],
  ['24:00', null],
  ['12:60', null],
  ['15', null],
])('parseTime(%s) = %s', (input, expected) => {
  expect(parseTime(input)).toBe(expected);
});

const form: EventForm = {
  title: ' Reiten ',
  kind: 'ride',
  childId: 'child-1',
  location: '',
  weekly: true,
  firstDate: '6.10.2026', // a Tuesday
  untilDate: '',
  time: '15:00',
  durationMin: '60',
};

test('"Reiten, jeden Di 15 Uhr" becomes a weekly rule on Tuesday', () => {
  expect(toEventInsert(form, 'fam-1')).toEqual({
    ok: true,
    value: {
      family_id: 'fam-1',
      child_id: 'child-1',
      title: 'Reiten',
      kind: 'ride',
      location: null,
      start_time: '15:00',
      duration_min: 60,
      rrule: 'FREQ=WEEKLY;BYDAY=TU',
      first_date: '2026-10-06',
      until_date: null,
    },
  });
});

test('weekday comes from the first date (Sunday)', () => {
  const r = toEventInsert({ ...form, firstDate: '11.10.2026' }, 'fam-1');
  expect(r.ok && r.value.rrule).toBe('FREQ=WEEKLY;BYDAY=SU');
});

test('one-off event has no rule and ignores the end date', () => {
  const r = toEventInsert({ ...form, weekly: false, untilDate: 'Quatsch' }, 'fam-1');
  expect(r.ok && [r.value.rrule, r.value.until_date]).toEqual([null, null]);
});

test.each([
  [{ title: '  ' }, 'title'],
  [{ childId: null }, 'child'],
  [{ firstDate: '31.02.2026' }, 'date'],
  [{ time: '25:00' }, 'time'],
  [{ durationMin: '0' }, 'duration'],
  [{ untilDate: '1.1.2020' }, 'untilBeforeFirst'],
  [{ untilDate: 'bald' }, 'untilDate'],
])('invalid input %o -> %s', (patch, error) => {
  expect(toEventInsert({ ...form, ...patch }, 'fam-1')).toEqual({ ok: false, error });
});

test('describeSchedule', () => {
  expect(
    describeSchedule({
      rrule: 'FREQ=WEEKLY;BYDAY=TU',
      first_date: '2026-10-06',
      until_date: null,
      start_time: '15:00:00',
    }),
  ).toBe('Jeden Dienstag, 15:00 Uhr (ab 06.10.2026)');
  expect(
    describeSchedule({
      rrule: null,
      first_date: '2026-10-08',
      until_date: null,
      start_time: '09:30:00',
    }),
  ).toBe('Einmalig am 08.10.2026, 09:30 Uhr');
});
