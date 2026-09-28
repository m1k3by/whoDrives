import { dayLabel, groupByDay, timeLabel } from './days';

const now = new Date(2026, 9, 5, 22, 30); // Mon 05.10.2026 22:30 local

test('dayLabel', () => {
  expect(dayLabel(new Date(2026, 9, 5, 8, 0), now)).toBe('Heute');
  expect(dayLabel(new Date(2026, 9, 6, 0, 0), now)).toBe('Morgen');
  expect(dayLabel(new Date(2026, 9, 7, 15, 0), now)).toBe('Mittwoch, 07.10.');
  expect(dayLabel(new Date(2026, 10, 1, 15, 0), now)).toBe('Sonntag, 01.11.');
});

test('dayLabel across month end', () => {
  expect(dayLabel(new Date(2026, 10, 1), new Date(2026, 9, 31, 12))).toBe('Morgen');
});

test('timeLabel', () => {
  expect(timeLabel(new Date(2026, 9, 5, 9, 5))).toBe('09:05');
});

test('groupByDay keeps order and groups consecutive days', () => {
  const at = (d: number, h: number) => ({ starts_at: new Date(2026, 9, d, h).toISOString(), h });
  const groups = groupByDay([at(5, 15), at(6, 8), at(6, 16), at(8, 9)], now);
  expect(groups.map((g) => [g.label, g.items.map((i) => i.h)])).toEqual([
    ['Heute', [15]],
    ['Morgen', [8, 16]],
    ['Donnerstag, 08.10.', [9]],
  ]);
});
