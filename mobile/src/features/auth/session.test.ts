import { AuthRetryableFetchError, type Session } from '@supabase/supabase-js';

import { loadSession } from './session';

const session = { access_token: 'x' } as Session;

test('returns the session when loading works', async () => {
  const result = await loadSession(async () => ({ data: { session }, error: null }), 1000);
  expect(result).toBe(session);
});

test('returns null when logged out', async () => {
  const result = await loadSession(async () => ({ data: { session: null }, error: null }), 1000);
  expect(result).toBeNull();
});

// Real supabase-js behaviour (measured): expired session + server down
// -> { session: null, error: AuthRetryableFetchError } after ~25 s.
test('network error is offline, not logged out', async () => {
  const result = await loadSession(
    async () => ({
      data: { session: null },
      error: new AuthRetryableFetchError('fetch failed', 0),
    }),
    1000,
  );
  expect(result).toBe('offline');
});

test('hanging request is offline after the timeout', async () => {
  const result = await loadSession(() => new Promise(() => {}), 50);
  expect(result).toBe('offline');
});
