import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Alert, type AlertButton, Linking } from 'react-native';

import type { Occurrence } from './hooks';
import { OccurrenceItem } from './OccurrenceItem';

// The first render loads React Native + React Query and can take >5 s on a cold run.
jest.setTimeout(60_000);

const mockRpc = jest.fn();
jest.mock('@/lib/supabase', () => ({
  supabase: { rpc: (...args: unknown[]) => mockRpc(...args) },
}));

const mockCreateEvent = jest.fn().mockResolvedValue({ action: 'done' });
jest.mock('expo-calendar/legacy', () => ({
  createEventInCalendarAsync: (...args: unknown[]) => mockCreateEvent(...args),
}));

beforeAll(() => jest.useFakeTimers({ now: new Date(2026, 9, 5, 12, 0) })); // Mon 05.10.2026
afterAll(() => jest.useRealTimers());
beforeEach(() => {
  mockRpc.mockReset();
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});

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

async function show(o: Occurrence, myId: string) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  await render(
    <QueryClientProvider client={client}>
      <OccurrenceItem occurrence={o} dayLabel="Dienstag, 06.10." myId={myId} />
    </QueryClientProvider>,
  );
}

function pressAlertButton(text: string) {
  const buttons = (jest.mocked(Alert.alert).mock.calls.at(-1)?.[2] ?? []) as AlertButton[];
  buttons.find((b) => b.text === text)?.onPress?.();
}

test('open occurrence: grandparent takes it over', async () => {
  mockRpc.mockResolvedValue({ data: true, error: null });
  await show(occurrence(), OMA);

  expect(screen.getByText('Noch offen – wer übernimmt?')).toBeTruthy();
  await fireEvent.press(screen.getByText('Ich übernehme'));
  expect(mockRpc).toHaveBeenCalledWith('claim_occurrence', { p_occurrence_id: 'occ-1' });
});

test('someone else was faster: explains it', async () => {
  mockRpc.mockResolvedValue({ data: false, error: null });
  await show(occurrence(), OMA);

  await fireEvent.press(screen.getByText('Ich übernehme'));
  expect(await screen.findByText('Schon vergeben – jemand anderes war schneller.')).toBeTruthy();
});

test('claimed by me: can give it back', async () => {
  mockRpc.mockResolvedValue({ data: true, error: null });
  await show(
    occurrence({ status: 'claimed', assigned_to: OMA, profiles: { display_name: 'Oma' } }),
    OMA,
  );

  expect(screen.getByText('Du übernimmst das.')).toBeTruthy();
  expect(screen.queryByText('Ich übernehme')).toBeNull();
  await fireEvent.press(screen.getByText('Doch nicht – wieder freigeben'));
  expect(mockRpc).toHaveBeenCalledWith('release_occurrence', { p_occurrence_id: 'occ-1' });
});

// Equal rights (2026-09-29): every member may release someone else's claim.
test('claimed by someone else: grandparent sees the name and may release after confirming', async () => {
  mockRpc.mockResolvedValue({ data: true, error: null });
  await show(
    occurrence({ status: 'claimed', assigned_to: MAMA, profiles: { display_name: 'Mama' } }),
    OMA,
  );

  expect(screen.getByText('Übernimmt: Mama')).toBeTruthy();
  expect(screen.queryByText('Ich übernehme')).toBeNull();
  await fireEvent.press(screen.getByText('Freigeben'));
  expect(mockRpc).not.toHaveBeenCalled();
  pressAlertButton('Freigeben');
  await waitFor(() =>
    expect(mockRpc).toHaveBeenCalledWith('release_occurrence', { p_occurrence_id: 'occ-1' }),
  );
});

test('every member can cancel by tapping the entry and confirming', async () => {
  mockRpc.mockResolvedValue({ data: null, error: null });
  await show(occurrence(), OMA);

  await fireEvent.press(screen.getByText(/Reiten/));
  pressAlertButton('Termin absagen');
  await waitFor(() =>
    expect(mockRpc).toHaveBeenCalledWith('cancel_occurrence', { p_occurrence_id: 'occ-1' }),
  );
});

test('claim of a deleted account shows "ehemaliges Mitglied"', async () => {
  await show(occurrence({ status: 'claimed', assigned_to: null }), OMA);
  expect(screen.getByText('Übernimmt: ehemaliges Mitglied')).toBeTruthy();
});

test('cancelled or past occurrences cannot be taken', async () => {
  await show(occurrence({ status: 'cancelled' }), OMA);
  expect(screen.getByText('Abgesagt')).toBeTruthy();
  expect(screen.queryByText('Ich übernehme')).toBeNull();

  await show(
    occurrence({ starts_at: '2026-10-04T13:00:00Z', ends_at: '2026-10-04T14:00:00Z' }),
    OMA,
  );
  expect(screen.queryByText('Ich übernehme')).toBeNull();
});

test('tapping the place opens it in Google Maps', async () => {
  const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  await show(
    occurrence({
      events: { ...occurrence().events!, location: 'Reitstall Sonnenhof, Waldweg 3' },
    }),
    OMA,
  );

  await fireEvent.press(screen.getByText('Reitstall Sonnenhof, Waldweg 3'));
  expect(open).toHaveBeenCalledWith(
    'https://www.google.com/maps/search/?api=1&query=Reitstall%20Sonnenhof%2C%20Waldweg%203',
  );
});

test('"In meinen Kalender" hands the occurrence to the phone calendar', async () => {
  await show(occurrence(), OMA);

  await fireEvent.press(screen.getByText('In meinen Kalender'));
  expect(mockCreateEvent).toHaveBeenCalledWith({
    title: 'Reiten (Lena)',
    location: undefined,
    startDate: new Date('2026-10-06T13:00:00Z'),
    endDate: new Date('2026-10-06T14:00:00Z'),
  });
});
