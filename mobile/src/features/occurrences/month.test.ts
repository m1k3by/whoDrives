import { addMonths, dayKey, fromDayKey, monthGrid } from './month';

const days = (month: Date) => monthGrid(month).map((w) => w.map((d) => d?.getDate() ?? 0));

test('October 2026 starts on a Thursday, Monday first', () => {
  expect(days(new Date(2026, 9, 1))).toEqual([
    [0, 0, 0, 1, 2, 3, 4],
    [5, 6, 7, 8, 9, 10, 11],
    [12, 13, 14, 15, 16, 17, 18],
    [19, 20, 21, 22, 23, 24, 25],
    [26, 27, 28, 29, 30, 31, 0],
  ]);
});

test('month starting on Monday has no leading gap (February 2027)', () => {
  const grid = days(new Date(2027, 1, 1));
  expect(grid[0]).toEqual([1, 2, 3, 4, 5, 6, 7]);
  expect(grid).toHaveLength(4);
});

test('month starting on Sunday needs six rows (November 2026)', () => {
  const grid = days(new Date(2026, 10, 1));
  expect(grid[0]).toEqual([0, 0, 0, 0, 0, 0, 1]);
  expect(grid).toHaveLength(6);
  expect(grid[5]).toEqual([30, 0, 0, 0, 0, 0, 0]);
});

test('leap year February 2028 has 29 days', () => {
  expect(
    days(new Date(2028, 1, 1))
      .flat()
      .filter(Boolean),
  ).toHaveLength(29);
});

test('fromDayKey is the inverse of dayKey', () => {
  expect(fromDayKey('2026-10-06')).toEqual(new Date(2026, 9, 6));
  expect(dayKey(fromDayKey('2028-02-29'))).toBe('2028-02-29');
});

test('addMonths crosses the year and ignores the day of month', () => {
  expect(dayKey(addMonths(new Date(2026, 11, 31), 1))).toBe('2027-01-01');
  expect(dayKey(addMonths(new Date(2026, 0, 31), -1))).toBe('2025-12-01');
});
