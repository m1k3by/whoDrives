import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { MonthCalendar } from './MonthCalendar';

// Oct 6: open, Oct 7: only a cancelled one, Oct 14: open.
const rows = [
  {
    id: '1',
    starts_at: '2026-10-06T13:00:00Z',
    ends_at: '2026-10-06T14:00:00Z',
    status: 'open',
    events: { children: { color: '#1E6FD9' } },
  },
  {
    id: '2',
    starts_at: '2026-10-07T15:00:00Z',
    ends_at: '2026-10-07T16:00:00Z',
    status: 'cancelled',
    events: { children: { color: '#D63031' } },
  },
  {
    id: '3',
    starts_at: '2026-10-14T13:00:00Z',
    ends_at: '2026-10-14T14:00:00Z',
    status: 'open',
    events: { children: { color: '#2E9E44' } },
  },
];

jest.mock('@/lib/supabase', () => {
  const query: Record<string, unknown> = {};
  for (const m of ['from', 'select', 'eq', 'gte', 'lt']) query[m] = () => query;
  query.order = async () => ({ data: rows, error: null });
  return { supabase: query };
});

// The first render loads React Native + React Query and can take >5 s on a cold run.
jest.setTimeout(60_000);

beforeAll(() => {
  jest.useFakeTimers({ now: new Date(2026, 9, 5, 12, 0) }); // Mon 05.10.2026
});
afterAll(() => jest.useRealTimers());

async function renderCalendar(onSelect = jest.fn()) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await render(
    <QueryClientProvider client={client}>
      <MonthCalendar familyId="fam" selected={new Date(2026, 9, 5)} onSelect={onSelect} />
    </QueryClientProvider>,
  );
  return onSelect;
}

test('shows the current month with German labels', async () => {
  await renderCalendar();
  expect(await screen.findByText('Oktober 2026')).toBeTruthy();
  expect(screen.getByText('Mo')).toBeTruthy();
  expect(screen.getByText('So')).toBeTruthy();
});

test('days with non-cancelled occurrences are announced as having events', async () => {
  await renderCalendar();
  expect(await screen.findByLabelText('6. Oktober, Termine')).toBeTruthy();
  expect(screen.getByLabelText('14. Oktober, Termine')).toBeTruthy();
  expect(screen.getByLabelText('7. Oktober')).toBeTruthy();
});

test('tapping a day selects it', async () => {
  const onSelect = await renderCalendar();
  await fireEvent.press(await screen.findByLabelText('14. Oktober, Termine'));
  expect(onSelect).toHaveBeenCalledWith(new Date(2026, 9, 14));
});

test('next-month arrow switches to November and selects the 1st', async () => {
  const onSelect = await renderCalendar();
  await fireEvent.press(await screen.findByLabelText('Nächster Monat'));
  expect(await screen.findByText('November 2026')).toBeTruthy();
  expect(onSelect).toHaveBeenCalledWith(new Date(2026, 10, 1));
});
