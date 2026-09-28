import { fireEvent, render, screen } from '@testing-library/react-native';

import { TimeField } from './TimeField';

// The first render loads React Native and can take >5 s on a cold run.
jest.setTimeout(60_000);

test('choose hour and minute, then apply', async () => {
  const onChange = jest.fn();
  await render(<TimeField label="Uhrzeit" value="" onChange={onChange} />);

  await fireEvent.press(screen.getByLabelText('Uhrzeit: Uhrzeit wählen'));
  await fireEvent.press(screen.getByLabelText('15 Uhr'));
  await fireEvent.press(screen.getByLabelText('30 Minuten'));
  expect(screen.getByText('15:30 Uhr')).toBeTruthy();

  await fireEvent.press(screen.getByText('Übernehmen'));
  expect(onChange).toHaveBeenCalledWith('15:30');
});

test('apply does nothing until hour and minute are chosen', async () => {
  const onChange = jest.fn();
  await render(<TimeField label="Uhrzeit" value="" onChange={onChange} />);

  await fireEvent.press(screen.getByLabelText('Uhrzeit: Uhrzeit wählen'));
  await fireEvent.press(screen.getByLabelText('9 Uhr'));
  await fireEvent.press(screen.getByText('Übernehmen'));
  expect(onChange).not.toHaveBeenCalled();
  expect(screen.getByText('Bitte Stunde und Minute antippen.')).toBeTruthy();
});

test('existing time is preselected and can be changed', async () => {
  const onChange = jest.fn();
  await render(<TimeField label="Uhrzeit" value="16:15" onChange={onChange} />);

  await fireEvent.press(screen.getByLabelText('Uhrzeit: 16:15 Uhr'));
  await fireEvent.press(screen.getByLabelText('8 Uhr'));
  await fireEvent.press(screen.getByText('Übernehmen'));
  expect(onChange).toHaveBeenCalledWith('08:15');
});
