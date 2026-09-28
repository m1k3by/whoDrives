const pad = (n: number) => String(n).padStart(2, '0');

/** "2026-10-06" in device local time */
export const dayKey = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** "2026-10-06" -> local midnight of that day */
export const fromDayKey = (key: string) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const startOfToday = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
};

/** First day of the month `offset` months after `base`'s month. */
export const addMonths = (base: Date, offset: number) =>
  new Date(base.getFullYear(), base.getMonth() + offset, 1);

/**
 * Weeks of a month, Monday first. Days outside the month are null,
 * e.g. October 2026 starts on a Thursday: [null, null, null, 1, 2, 3, 4], ...
 */
export function monthGrid(month: Date): (Date | null)[][] {
  const year = month.getFullYear();
  const m = month.getMonth();
  const daysInMonth = new Date(year, m + 1, 0).getDate();
  const leading = (new Date(year, m, 1).getDay() + 6) % 7; // Monday = 0
  const cells: (Date | null)[] = [
    ...Array<null>(leading).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, m, i + 1)),
  ];
  while (cells.length % 7) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, w) => cells.slice(w * 7, w * 7 + 7));
}
