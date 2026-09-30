import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { FlatList } from 'react-native';

import { MonthCalendar } from './MonthCalendar';

// Oct 6: open, Oct 7: only a cancelled one, Oct 14: open, Oct 20: taken.
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
  {
    id: '4',
    starts_at: '2026-10-20T13:00:00Z',
    ends_at: '2026-10-20T14:00:00Z',
    status: 'claimed',
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

function calendar(selected: Date, onSelect: (d: Date) => void, client: QueryClient) {
  return (
    <QueryClientProvider client={client}>
      <MonthCalendar familyId="fam" selected={selected} onSelect={onSelect} />
    </QueryClientProvider>
  );
}

async function renderCalendar(onSelect = jest.fn()) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await render(calendar(new Date(2026, 9, 5), onSelect, client));
  return onSelect;
}

test('shows the month of the selected day with German weekdays', async () => {
  await renderCalendar();
  expect(await screen.findByLabelText('5. Oktober')).toBeTruthy();
  expect(screen.getByText('Mo')).toBeTruthy();
  expect(screen.getByText('So')).toBeTruthy();
});

test('days announce open (red) and taken (green) occurrences, cancelled ones not', async () => {
  await renderCalendar();
  expect(await screen.findByLabelText('6. Oktober, 1 offen')).toBeTruthy();
  expect(screen.getByLabelText('14. Oktober, 1 offen')).toBeTruthy();
  expect(screen.getByLabelText('7. Oktober')).toBeTruthy();
  expect(screen.getByLabelText('20. Oktober, 1 vergeben')).toBeTruthy();
});

test('tapping a day selects it', async () => {
  const onSelect = await renderCalendar();
  await fireEvent.press(await screen.findByLabelText('14. Oktober, 1 offen'));
  expect(onSelect).toHaveBeenCalledWith(new Date(2026, 9, 14));
});

test('follows the selection when it jumps to another month (e.g. "Heute")', async () => {
  const scroll = jest.spyOn(FlatList.prototype, 'scrollToIndex').mockImplementation(() => {});
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const onSelect = jest.fn();
  const { rerender } = await render(calendar(new Date(2026, 9, 5), onSelect, client));
  expect(scroll).not.toHaveBeenCalled();

  // months: Sep 2026 (0), Oct (1), Nov, Dec, Jan 2027 (4)
  await rerender(calendar(new Date(2027, 0, 12), onSelect, client));
  expect(scroll).toHaveBeenCalledWith({ index: 4 });
  // the parent chose the day itself; the calendar must not overwrite it
  expect(onSelect).not.toHaveBeenCalled();
  scroll.mockRestore();
});

test('only months near the visible one are rendered (performance)', async () => {
  await renderCalendar();
  expect(await screen.findByLabelText('5. Oktober')).toBeTruthy();
  // March 2027 is five months ahead: rendering it (and its query) up front made the app slow
  expect(screen.queryByLabelText('1. März')).toBeNull();
});
