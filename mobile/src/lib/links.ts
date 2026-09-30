// Public web pages (hosted on michael-stoecker.com, sources in docs/web/).
export const PRIVACY_URL = 'https://michael-stoecker.com/whodrives/datenschutz.html';
export const DELETE_ACCOUNT_URL = 'https://michael-stoecker.com/whodrives/konto-loeschen.html';

// One link for every phone: the page shows the code and leads to the right store.
// The code stays after '#', so it is never sent to the web server.
export const inviteLink = (code: string) =>
  `https://michael-stoecker.com/whodrives/app.html#${code}`;
