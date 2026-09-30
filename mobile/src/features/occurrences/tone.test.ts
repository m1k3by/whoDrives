import { dayTones, occurrenceTone } from './tone';

const now = new Date('2026-10-06T12:00:00Z');
const later = '2026-10-06T16:00:00Z';
const earlier = '2026-10-06T10:00:00Z';

test.each([
  [{ status: 'open', ends_at: later }, 'open'],
  [{ status: 'claimed', ends_at: later }, 'covered'],
  [{ status: 'claimed', ends_at: earlier }, 'covered'],
  [{ status: 'cancelled', ends_at: later }, 'cancelled'],
  [{ status: 'open', ends_at: earlier }, 'missed'],
])('%o is %s', (o, tone) => {
  expect(occurrenceTone(o, now)).toBe(tone);
});

test('day dots: open first, cancelled left out', () => {
  expect(dayTones(['covered', 'cancelled', 'open', 'missed', 'open'])).toEqual([
    'open',
    'open',
    'covered',
    'missed',
  ]);
});
