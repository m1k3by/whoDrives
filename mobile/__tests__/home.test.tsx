import { fireEvent, render, screen } from '@testing-library/react-native';

import HomeScreen from '../app/index';

// The first render loads React Native and can take >5 s on a cold run.
jest.setTimeout(60_000);

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ router: { push: (path: string) => mockPush(path) } }));
jest.mock('@/features/profile/hooks', () => ({
  useMyProfile: () => ({
    isPending: false,
    isError: false,
    data: { id: 'user-oma', display_name: 'Oma', email: 'oma@example.com' },
  }),
}));
jest.mock('@/features/family/hooks', () => ({
  useMyFamily: () => ({
    isPending: false,
    isError: false,
    data: { id: 'fam-1', name: 'Familie Muster', family_members: [] },
  }),
  useCreateFamily: () => ({ mutate: jest.fn(), isPending: false, isError: false }),
}));
jest.mock('@/features/invites/hooks', () => ({
  useRedeemInvite: () => ({ mutate: jest.fn(), isPending: false, isError: false }),
  InvalidInviteError: class extends Error {},
}));
jest.mock('@/features/push/register', () => ({ usePushRegistration: () => {} }));
const mockMutation = { mutate: jest.fn(), isPending: false, isError: false, error: null };
jest.mock('@/features/occurrences/hooks', () => ({
  useOccurrences: () => ({ isPending: false, isError: false, data: [] }),
  useLiveOccurrences: () => {},
  useClaimOccurrence: () => mockMutation,
  useReleaseOccurrence: () => mockMutation,
  useCancelOccurrence: () => mockMutation,
  AlreadyTakenError: class extends Error {},
}));

beforeAll(() => jest.useFakeTimers({ now: new Date(2026, 9, 5, 12, 0) })); // Mon 05.10.2026
afterAll(() => jest.useRealTimers());
beforeEach(() => mockPush.mockClear());

test('header shows the month; tapping it collapses and expands the calendar', async () => {
  await render(<HomeScreen />);

  expect(screen.getByText('Oktober 2026 ▴')).toBeTruthy();
  expect(screen.getByLabelText('14. Oktober')).toBeTruthy();

  await fireEvent.press(screen.getByLabelText('Kalender einklappen'));
  expect(screen.queryByLabelText('14. Oktober')).toBeNull();
  expect(screen.getByText('Oktober 2026 ▾')).toBeTruthy();
  // the day list stays visible
  expect(screen.getByText('An diesem Tag steht nichts an.')).toBeTruthy();

  await fireEvent.press(screen.getByLabelText('Kalender ausklappen'));
  expect(screen.getByLabelText('14. Oktober')).toBeTruthy();
});

test('"Heute" goes back to today after choosing another day', async () => {
  await render(<HomeScreen />);

  await fireEvent.press(screen.getByLabelText('14. Oktober'));
  expect(screen.getByText('Mittwoch, 14.10.')).toBeTruthy();

  await fireEvent.press(screen.getByRole('button', { name: 'Heute' }));
  expect(screen.queryByText('Mittwoch, 14.10.')).toBeNull();
  expect(screen.getByLabelText('5. Oktober').props.accessibilityState).toEqual({ selected: true });
});

test('the + button creates an event on the selected day', async () => {
  await render(<HomeScreen />);

  await fireEvent.press(screen.getByLabelText('14. Oktober'));
  await fireEvent.press(screen.getByLabelText('Neuer Termin'));
  expect(mockPush).toHaveBeenLastCalledWith({
    pathname: '/event-new',
    params: { date: '2026-10-14' },
  });
});

test('menu and search open from the header', async () => {
  await render(<HomeScreen />);

  await fireEvent.press(screen.getByLabelText('Menü öffnen'));
  expect(mockPush).toHaveBeenLastCalledWith('/menu');
  await fireEvent.press(screen.getByLabelText('Suchen'));
  expect(mockPush).toHaveBeenLastCalledWith('/search');
});
