import { fireEvent, render, screen } from '@testing-library/react-native';

import UpcomingScreen from '../app/upcoming';

// The first render loads React Native and can take >5 s on a cold run.
jest.setTimeout(60_000);

const event = (title: string) => ({
  title,
  kind: 'ride',
  location: null,
  children: { first_name: 'Lena', color: '#1E6FD9' },
});
const mockRows = [
  {
    id: '1',
    starts_at: '2026-10-06T13:00:00Z',
    ends_at: '2026-10-06T14:00:00Z',
    status: 'open',
    assigned_to: null,
    profiles: null,
    events: event('Reiten'),
  },
  {
    id: '2',
    starts_at: '2026-10-07T13:00:00Z',
    ends_at: '2026-10-07T14:00:00Z',
    status: 'claimed',
    assigned_to: 'user-oma',
    profiles: { display_name: 'Oma' },
    events: event('Schwimmen'),
  },
  {
    id: '3',
    starts_at: '2026-10-08T13:00:00Z',
    ends_at: '2026-10-08T14:00:00Z',
    status: 'claimed',
    assigned_to: 'user-mama',
    profiles: { display_name: 'Mama' },
    events: event('Fußball'),
  },
];

const mockMutation = { mutate: jest.fn(), isPending: false, isError: false, error: null };
jest.mock('@/features/occurrences/hooks', () => ({
  useOccurrences: () => ({ isPending: false, isError: false, data: mockRows }),
  useClaimOccurrence: () => mockMutation,
  useReleaseOccurrence: () => mockMutation,
  useCancelOccurrence: () => mockMutation,
  AlreadyTakenError: class extends Error {},
}));
jest.mock('@/features/family/hooks', () => ({
  useMyMembership: () => ({ family: { id: 'fam-1' }, myId: 'user-oma', isParent: false }),
}));

beforeAll(() => jest.useFakeTimers({ now: new Date(2026, 9, 5, 12, 0) })); // Mon 05.10.2026
afterAll(() => jest.useRealTimers());

test('shows counts and filters by open and mine', async () => {
  await render(<UpcomingScreen />);

  // all: everybody sees who does what
  expect(screen.getByText('Alle (3)')).toBeTruthy();
  expect(screen.getByText('Übernimmt: Mama')).toBeTruthy();
  expect(screen.getByText('Du übernimmst das.')).toBeTruthy();

  await fireEvent.press(screen.getByText('Offen (1)'));
  expect(screen.getByText(/Reiten/)).toBeTruthy();
  expect(screen.queryByText(/Schwimmen/)).toBeNull();
  expect(screen.queryByText(/Fußball/)).toBeNull();

  await fireEvent.press(screen.getByText('Meine (1)'));
  expect(screen.getByText(/Schwimmen/)).toBeTruthy();
  expect(screen.queryByText(/Reiten/)).toBeNull();
  expect(screen.queryByText(/Fußball/)).toBeNull();
});
