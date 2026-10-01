import { fireEvent, render, screen } from '@testing-library/react-native';

import NewEventScreen from '../app/event-new';

// The first render loads React Native and can take >5 s on a cold run.
jest.setTimeout(60_000);

const mockMutate = jest.fn();
jest.mock('@/features/events/hooks', () => ({
  useChildren: () => ({
    data: [
      { id: 'child-lena', first_name: 'Lena', color: '#1E6FD9' },
      { id: 'child-tom', first_name: 'Tom', color: '#2E9E44' },
    ],
  }),
  useCreateEvent: () => ({ mutate: mockMutate, isPending: false, isError: false }),
}));
jest.mock('@/features/family/hooks', () => ({
  useMyMembership: () => ({ family: { id: 'fam-1' } }),
}));
let mockParams: { date?: string } = {};
jest.mock('expo-router', () => ({
  router: { back: jest.fn() },
  useLocalSearchParams: () => mockParams,
}));

beforeAll(() => jest.useFakeTimers({ now: new Date(2026, 9, 5, 12, 0) })); // Mon 05.10.2026
afterAll(() => jest.useRealTimers());

test('"Reiten, jeden Dienstag 15:30, 1½ Std." is saved without typing date, time or duration', async () => {
  await render(<NewEventScreen />);

  await fireEvent.changeText(screen.getByLabelText('Was?'), 'Reiten');
  await fireEvent.press(screen.getByText('Lena'));

  await fireEvent.press(screen.getByLabelText('Erster Termin: Datum wählen'));
  await fireEvent.press(screen.getByLabelText('6. Oktober'));
  expect(screen.getByText('Wiederholt sich jeden Dienstag.')).toBeTruthy();

  await fireEvent.press(screen.getByLabelText('Uhrzeit: Uhrzeit wählen'));
  await fireEvent.press(screen.getByLabelText('15 Uhr'));
  await fireEvent.press(screen.getByLabelText('30 Minuten'));
  await fireEvent.press(screen.getByText('Übernehmen'));

  await fireEvent.press(screen.getByText('1½ Std.'));
  await fireEvent.press(screen.getByText('Termin speichern'));

  expect(mockMutate).toHaveBeenCalledWith(
    expect.objectContaining({
      family_id: 'fam-1',
      child_id: 'child-lena',
      title: 'Reiten',
      kind: 'ride',
      start_time: '15:30',
      duration_min: 90,
      rrule: 'FREQ=WEEKLY;BYDAY=TU',
      first_date: '2026-10-06',
      until_date: null,
    }),
    expect.anything(),
  );
});

test('opened from the calendar: the chosen day is preselected', async () => {
  mockParams = { date: '2026-10-20' };
  await render(<NewEventScreen />);
  expect(screen.getByLabelText('Erster Termin: Dienstag, 20.10.2026')).toBeTruthy();
  expect(screen.getByText('Wiederholt sich jeden Dienstag.')).toBeTruthy();
  mockParams = {};
});

test('saving without date and time shows what is missing', async () => {
  mockMutate.mockClear();
  await render(<NewEventScreen />);

  await fireEvent.changeText(screen.getByLabelText('Was?'), 'Zahnarzt');
  await fireEvent.press(screen.getByText('Lena'));
  await fireEvent.press(screen.getByText('Termin speichern'));

  expect(screen.getByText('Bitte wähle ein Datum.')).toBeTruthy();
  expect(mockMutate).not.toHaveBeenCalled();
});

test('both children can be chosen for one appointment; tapping again removes one', async () => {
  mockMutate.mockClear();
  mockParams = { date: '2026-10-20' };
  await render(<NewEventScreen />);

  await fireEvent.changeText(screen.getByLabelText('Was?'), 'Schwimmen');
  await fireEvent.press(screen.getByText('Tom'));
  await fireEvent.press(screen.getByText('Lena'));
  await fireEvent.press(screen.getByText('✓ Tom')); // removed again
  await fireEvent.press(screen.getByText('Tom')); // and added after Lena
  await fireEvent.press(screen.getByLabelText('Uhrzeit: Uhrzeit wählen'));
  await fireEvent.press(screen.getByLabelText('15 Uhr'));
  await fireEvent.press(screen.getByLabelText('0 Minuten'));
  await fireEvent.press(screen.getByText('Übernehmen'));
  await fireEvent.press(screen.getByText('Termin speichern'));

  expect(mockMutate).toHaveBeenCalledWith(
    expect.objectContaining({ child_id: 'child-lena', child_ids: ['child-lena', 'child-tom'] }),
    expect.anything(),
  );
  mockParams = {};
});
