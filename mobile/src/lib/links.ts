// Public web pages (hosted on michael-stoecker.com, sources in docs/web/).
export const PRIVACY_URL = 'https://michael-stoecker.com/whodrives/datenschutz.html';
export const DELETE_ACCOUNT_URL = 'https://michael-stoecker.com/whodrives/konto-loeschen.html';

// Opens the app in the Play Store. Add the App Store link once the iOS app exists.
export const STORE_URL =
  'https://play.google.com/store/apps/details?id=com.michael_stoecker.whodrives';

/** Google Maps (app if installed, otherwise browser) searching for the place */
export const mapsUrl = (place: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place)}`;
