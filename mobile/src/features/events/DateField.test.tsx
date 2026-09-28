import { fireEvent, render, screen } from '@testing-library/react-native';

import { DateField } from './DateField';

// The first render loads React Native and can take >5 s on a cold run.
jest.setTimeout(60_000);

beforeAll(() => jest.useFakeTimers({ now: new Date(2026, 9, 5, 12, 0) })); // Mon 05.10.2026
afterAll(() => jest.useRealTimers());

test('empty field opens the current month and returns the tapped day', async () => {
  const onChange = jest.fn();
  await render(<DateField label="Erster Termin" value="" onChange={onChange} />);

  await fireEvent.press(screen.getByLabelText('Erster Termin: Datum wählen'));
  expect(screen.getByText('Oktober 2026')).toBeTruthy();

  await fireEvent.press(screen.getByLabelText('13. Oktober'));
  expect(onChange).toHaveBeenCalledWith('2026-10-13');
});

test('shows the chosen date and opens its month', async () => {
  await render(<DateField label="Datum" value="2027-01-12" onChange={jest.fn()} />);

  await fireEvent.press(screen.getByLabelText('Datum: Dienstag, 12.01.2027'));
  expect(screen.getByText('Januar 2027')).toBeTruthy();
});

test('arrows browse months; optional date can be cleared', async () => {
  const onChange = jest.fn();
  await render(
    <DateField
      label="Letzter Termin"
      value="2026-10-06"
      onChange={onChange}
      clearLabel="Kein Enddatum"
    />,
  );

  await fireEvent.press(screen.getByLabelText('Letzter Termin: Dienstag, 06.10.2026'));
  await fireEvent.press(screen.getByLabelText('Nächster Monat'));
  await fireEvent.press(screen.getByLabelText('1. November'));
  expect(onChange).toHaveBeenLastCalledWith('2026-11-01');

  await fireEvent.press(screen.getByText('Kein Enddatum'));
  expect(onChange).toHaveBeenLastCalledWith('');
});
