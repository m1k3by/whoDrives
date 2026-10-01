import { Linking, Platform } from 'react-native';

import { openInMaps } from './links';

beforeEach(() => jest.replaceProperty(Platform, 'OS', 'android'));
afterEach(() => jest.restoreAllMocks());

test('Android: the phone decides which map app opens (geo: link)', async () => {
  const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  await openInMaps('Hallenbad, Neukirchen');
  expect(open).toHaveBeenCalledTimes(1);
  expect(open).toHaveBeenCalledWith('geo:0,0?q=Hallenbad%2C%20Neukirchen');
});

test('no map app installed: Google Maps in the browser', async () => {
  const open = jest
    .spyOn(Linking, 'openURL')
    .mockRejectedValueOnce(new Error('No Activity found'))
    .mockResolvedValue(true);
  await openInMaps('Hallenbad');
  expect(open).toHaveBeenLastCalledWith(
    'https://www.google.com/maps/search/?api=1&query=Hallenbad',
  );
});
