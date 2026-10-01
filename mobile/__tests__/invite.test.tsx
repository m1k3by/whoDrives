import { fireEvent, render, screen } from '@testing-library/react-native';
import { Share } from 'react-native';

import InviteScreen from '../app/invite';

// The first render loads React Native and can take >5 s on a cold run.
jest.setTimeout(60_000);

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ familyId: 'fam-1', familyName: 'Familie Muster' }),
}));
jest.mock('@/features/invites/hooks', () => ({
  formatInviteCode: (code: string) => `${code.slice(0, 4)}-${code.slice(4)}`,
  useCreateInvite: () => ({
    data: { code: 'ABCD2345', expires_at: '2030-06-10T12:00:00Z' },
    reset: jest.fn(),
  }),
}));

test('shared invitation contains the Play Store link and the code', async () => {
  const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' });
  await render(<InviteScreen />);

  await fireEvent.press(screen.getByText('Einladung teilen'));

  const message = share.mock.calls[0][0].message;
  expect(message).toContain(
    'https://play.google.com/store/apps/details?id=com.michael_stoecker.whodrives',
  );
  expect(message).toContain('Einladungscode eingeben: ABCD-2345');
  expect(message).toContain('„Familie Muster“');
});
