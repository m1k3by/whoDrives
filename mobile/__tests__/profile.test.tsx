import { fireEvent, render, screen } from '@testing-library/react-native';
import { Alert, type AlertButton } from 'react-native';

import ProfileScreen from '../app/profile';
import { ThemeProvider } from '@/ui/theme';

// The first render loads React Native and can take >5 s on a cold run.
jest.setTimeout(60_000);

const mockDelete = jest.fn();
jest.mock('@/features/profile/hooks', () => ({
  useMyProfile: () => ({
    isPending: false,
    isError: false,
    data: { id: 'user-oma', display_name: 'Oma', email: 'oma@example.com' },
  }),
  useLogout: () => jest.fn(),
  useDeleteAccount: () => ({ mutate: mockDelete, isPending: false, isError: false }),
  useUpdateDisplayName: () => ({ mutate: jest.fn(), isPending: false }),
}));

const mockStore: Record<string, string> = {};
jest.mock('expo-secure-store', () => ({
  getItemAsync: async (key: string) => mockStore[key] ?? null,
  setItemAsync: async (key: string, value: string) => {
    mockStore[key] = value;
  },
}));

function pressAlertButton(text: string) {
  const buttons = (jest.mocked(Alert.alert).mock.calls.at(-1)?.[2] ?? []) as AlertButton[];
  buttons.find((b) => b.text === text)?.onPress?.();
}

beforeEach(() => {
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  mockDelete.mockClear();
});

test('account is deleted only after confirming', async () => {
  await render(<ProfileScreen />);

  await fireEvent.press(screen.getByText('Konto löschen'));
  expect(Alert.alert).toHaveBeenCalledWith(
    'Konto endgültig löschen?',
    expect.stringContaining('nicht rückgängig'),
    expect.any(Array),
  );
  expect(mockDelete).not.toHaveBeenCalled();

  pressAlertButton('Abbrechen');
  expect(mockDelete).not.toHaveBeenCalled();

  pressAlertButton('Endgültig löschen');
  expect(mockDelete).toHaveBeenCalledTimes(1);
});

test('dark mode is one switch and the choice is kept', async () => {
  await render(
    <ThemeProvider>
      <ProfileScreen />
    </ThemeProvider>,
  );
  const toggle = await screen.findByLabelText('Dark Mode');
  expect(toggle.props.value).toBe(false);

  await fireEvent(toggle, 'valueChange', true);
  expect(screen.getByLabelText('Dark Mode').props.value).toBe(true);
  expect(mockStore['whodrives.theme']).toBe('dark');
});
