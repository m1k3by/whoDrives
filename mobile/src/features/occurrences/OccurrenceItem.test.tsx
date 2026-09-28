import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react-native';

import type { Occurrence } from './hooks';
import { OccurrenceItem } from './OccurrenceItem';

// The first render loads React Native + React Query and can take >5 s on a cold run.
jest.setTimeout(60_000);

const mockRpc = jest.fn();
jest.mock('@/lib/supabase', () => ({
  supabase: { rpc: (...args: unknown[]) => mockRpc(...args) },
}));

beforeAll(() => jest.useFakeTimers({ now: new Date(2026, 9, 5, 12, 0) })); // Mon 05.10.2026
afterAll(() => jest.useRealTimers());
beforeEach(() => mockRpc.mockReset());

const OMA = 'user-oma';
const MAMA = 'user-mama';

const occurrence = (patch: Partial<Occurrence> = {}): Occurrence => ({
  id: 'occ-1',
  starts_at: '2026-10-06T13:00:00Z',
  ends_at: '2026-10-06T14:00:00Z',
  status: 'open',
  assigned_to: null,
  profiles: null,
  events: {
    title: 'Reiten',
    kind: 'ride',
    location: null,
    children: { first_name: 'Lena', color: '#1E6FD9' },
  },
  ...patch,
});

async function show(o: Occurrence, myId: string, isParent: boolean) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  await render(
    <QueryClientProvider client={client}>
      <OccurrenceItem occurrence={o} dayLabel="Dienstag, 06.10." myId={myId} isParent={isParent} />
    </QueryClientProvider>,
  );
}

test('open occurrence: grandparent takes it over', async () => {
  mockRpc.mockResolvedValue({ data: true, error: null });
  await show(occurrence(), OMA, false);

  expect(screen.getByText('Noch offen – wer übernimmt?')).toBeTruthy();
  await fireEvent.press(screen.getByText('Ich übernehme'));
  expect(mockRpc).toHaveBeenCalledWith('claim_occurrence', { p_occurrence_id: 'occ-1' });
});

test('someone else was faster: explains it', async () => {
  mockRpc.mockResolvedValue({ data: false, error: null });
  await show(occurrence(), OMA, false);

  await fireEvent.press(screen.getByText('Ich übernehme'));
  expect(await screen.findByText('Schon vergeben – jemand anderes war schneller.')).toBeTruthy();
});

test('claimed by me: can give it back', async () => {
  mockRpc.mockResolvedValue({ data: true, error: null });
  await show(
    occurrence({ status: 'claimed', assigned_to: OMA, profiles: { display_name: 'Oma' } }),
    OMA,
    false,
  );

  expect(screen.getByText('Du übernimmst das.')).toBeTruthy();
  expect(screen.queryByText('Ich übernehme')).toBeNull();
  await fireEvent.press(screen.getByText('Doch nicht – wieder freigeben'));
  expect(mockRpc).toHaveBeenCalledWith('release_occurrence', { p_occurrence_id: 'occ-1' });
});

test('claimed by someone else: grandparent only sees the name', async () => {
  await show(
    occurrence({ status: 'claimed', assigned_to: MAMA, profiles: { display_name: 'Mama' } }),
    OMA,
    false,
  );

  expect(screen.getByText('Übernimmt: Mama')).toBeTruthy();
  expect(screen.queryByText('Ich übernehme')).toBeNull();
  expect(screen.queryByText('Freigeben')).toBeNull();
});

test('claimed by someone else: parent may release it', async () => {
  await show(
    occurrence({ status: 'claimed', assigned_to: OMA, profiles: { display_name: 'Oma' } }),
    MAMA,
    true,
  );

  expect(screen.getByText('Übernimmt: Oma')).toBeTruthy();
  expect(screen.getByText('Freigeben')).toBeTruthy();
});

test('claim of a deleted account shows "ehemaliges Mitglied"', async () => {
  await show(occurrence({ status: 'claimed', assigned_to: null }), OMA, false);
  expect(screen.getByText('Übernimmt: ehemaliges Mitglied')).toBeTruthy();
});

test('cancelled or past occurrences cannot be taken', async () => {
  await show(occurrence({ status: 'cancelled' }), OMA, false);
  expect(screen.getByText('Abgesagt')).toBeTruthy();
  expect(screen.queryByText('Ich übernehme')).toBeNull();

  await show(
    occurrence({ starts_at: '2026-10-04T13:00:00Z', ends_at: '2026-10-04T14:00:00Z' }),
    OMA,
    false,
  );
  expect(screen.queryByText('Ich übernehme')).toBeNull();
});
