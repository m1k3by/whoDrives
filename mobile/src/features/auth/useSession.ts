import { useCallback, useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';

import { loadSession, type SessionState } from './session';

const SESSION_TIMEOUT_MS = 8000;

const load = () => loadSession(() => supabase.auth.getSession(), SESSION_TIMEOUT_MS);

export function useSession(): { session: SessionState; retry: () => void } {
  const [session, setSession] = useState<SessionState>(undefined);

  useEffect(() => {
    load().then(setSession);
    const { data } = supabase.auth.onAuthStateChange((event, s) => {
      // INITIAL_SESSION is handled by load(), which can tell "offline" from "logged out".
      if (event !== 'INITIAL_SESSION') setSession(s);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const retry = useCallback(() => {
    setSession(undefined);
    load().then(setSession);
  }, []);

  return { session, retry };
}
