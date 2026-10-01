import { fireEvent, render, screen } from '@testing-library/react-native';

import SearchScreen from '../app/search';

// The first render loads React Native and can take >5 s on a cold run.
jest.setTimeout(60_000);

const row = (id: string, day: number, title: string, child: string) => ({
  id,
  starts_at: new Date(2026, 9, day, 15, 0).toISOString(),
  ends_at: new Date(2026, 9, day, 16, 0).toISOString(),
  status: 'open',
  assigned_to: null,
  profiles: null,
  events: {
    title,
    kind: 'ride',
    location: null,
    event_children: [{ first_name: child, color: '#1E6FD9' }],
  },
});
const mockRows = [row('1', 6, 'Reiten', 'Lena'), row('2', 7, 'Fußball', 'Max')];
const mockMutation = { mutate: jest.fn(), isPending: false, isError: false, error: null };
jest.mock('@/features/occurrences/hooks', () => ({
  useOccurrences: () => ({ isPending: false, isError: false, data: mockRows }),
  useClaimOccurrence: () => mockMutation,
  useReleaseOccurrence: () => mockMutation,
  useCancelOccurrence: () => mockMutation,
  AlreadyTakenError: class extends Error {},
}));
jest.mock('@/features/family/hooks', () => ({
  useMyMembership: () => ({ family: { id: 'fam-1', name: 'Familie Muster' }, myId: 'user-oma' }),
}));

beforeAll(() => jest.useFakeTimers({ now: new Date(2026, 9, 5, 12, 0) })); // Mon 05.10.2026
afterAll(() => jest.useRealTimers());

test('typing finds matching occurrences, grouped by day', async () => {
  await render(<SearchScreen />);
  expect(screen.getByText('Durchsucht alle Termine der nächsten 12 Monate.')).toBeTruthy();

  await fireEvent.changeText(screen.getByLabelText('Suchen'), 'max');
  expect(await screen.findByText(/Fußball/)).toBeTruthy();
  expect(screen.getByText('Mittwoch, 07.10.')).toBeTruthy();
  expect(screen.queryByText(/Reiten/)).toBeNull();

  await fireEvent.changeText(screen.getByLabelText('Suchen'), 'ballett');
  expect(await screen.findByText('Nichts gefunden.')).toBeTruthy();
});
