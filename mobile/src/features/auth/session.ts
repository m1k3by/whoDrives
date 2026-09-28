import { isAuthRetryableFetchError, type Session } from '@supabase/supabase-js';

/** undefined = still loading, null = logged out, 'offline' = server not reachable */
export type SessionState = Session | null | undefined | 'offline';

type GetSession = () => Promise<{ data: { session: Session | null }; error: unknown }>;

/**
 * With an expired session and no connection, supabase-js keeps retrying the token refresh
 * for ~25 s and then reports "no session" although the user is still logged in.
 * We give up earlier and report 'offline' instead of showing the login screen.
 */
export async function loadSession(getSession: GetSession, timeoutMs: number) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<'offline'>((resolve) => {
    timer = setTimeout(() => resolve('offline'), timeoutMs);
  });
  const load = getSession().then(
    ({ data, error }) => (isAuthRetryableFetchError(error) ? 'offline' : data.session),
    () => 'offline' as const,
  );
  try {
    return await Promise.race([load, timeout]);
  } finally {
    clearTimeout(timer);
  }
}
