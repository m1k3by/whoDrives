import { Linking, Platform } from 'react-native';

// Public web pages (hosted on michael-stoecker.com, sources in docs/web/).
export const PRIVACY_URL = 'https://michael-stoecker.com/whodrives/datenschutz.html';
export const DELETE_ACCOUNT_URL = 'https://michael-stoecker.com/whodrives/konto-loeschen.html';

// Opens the app in the Play Store. Add the App Store link once the iOS app exists.
export const STORE_URL =
  'https://play.google.com/store/apps/details?id=com.michael_stoecker.whodrives';

/** Shows the place in the phone's default map app; Google Maps in the browser if there is none. */
export function openInMaps(place: string) {
  const q = encodeURIComponent(place);
  const native = Platform.OS === 'ios' ? `maps:?q=${q}` : `geo:0,0?q=${q}`;
  return Linking.openURL(native).catch(() =>
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${q}`),
  );
}
