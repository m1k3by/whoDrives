import { fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';

import { LocationField } from './LocationField';
import { placeLabel } from './places';

jest.setTimeout(60_000);

// Photon answer as checked against the real API (same place twice, as stable and riding school)
const photon = {
  features: [
    {
      properties: {
        name: 'Reitstall Sonnenhof',
        street: 'Waldweg',
        housenumber: '3',
        postcode: '47506',
        city: 'Neukirchen-Vluyn',
      },
    },
    {
      properties: {
        name: 'Reitstall Sonnenhof',
        street: 'Waldweg',
        housenumber: '3',
        postcode: '47506',
        city: 'Neukirchen-Vluyn',
      },
    },
    { properties: { street: 'Hauptstraße', housenumber: '5', postcode: '81249', city: 'München' } },
  ],
};

beforeEach(() => {
  globalThis.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => photon });
});

function Form() {
  const [value, setValue] = useState('');
  return <LocationField label="Wo?" placeholder="Ort" value={value} onChange={setValue} />;
}

test('label: name, street with number, postcode with town; missing parts are left out', () => {
  expect(placeLabel(photon.features[0].properties)).toBe(
    'Reitstall Sonnenhof, Waldweg 3, 47506 Neukirchen-Vluyn',
  );
  expect(placeLabel({ city: 'München' })).toBe('München');
});

test('typing shows each suggestion once, choosing one fills the field and hides the list', async () => {
  await render(<Form />);

  await fireEvent.changeText(screen.getByLabelText('Wo?'), 'Re');
  expect(globalThis.fetch).not.toHaveBeenCalled(); // fewer than 3 letters: no request

  await fireEvent.changeText(screen.getByLabelText('Wo?'), 'Reitstall');
  const place = await screen.findByText('Reitstall Sonnenhof, Waldweg 3, 47506 Neukirchen-Vluyn');
  expect(
    screen.getAllByText('Reitstall Sonnenhof, Waldweg 3, 47506 Neukirchen-Vluyn'),
  ).toHaveLength(1);
  expect(screen.getByText('Hauptstraße 5, 81249 München')).toBeTruthy();
  expect(String(jest.mocked(globalThis.fetch).mock.calls[0][0])).toContain('q=Reitstall');

  await fireEvent.press(place);
  expect(screen.getByLabelText('Wo?').props.value).toBe(
    'Reitstall Sonnenhof, Waldweg 3, 47506 Neukirchen-Vluyn',
  );
  expect(screen.queryByText('Hauptstraße 5, 81249 München')).toBeNull();
});
