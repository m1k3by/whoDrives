import { useQuery } from '@tanstack/react-query';
import * as Application from 'expo-application';

import { supabase } from '@/lib/supabase';

import { isOutdated } from './version';

/** Compares the installed native version with app_config.min_app_version. */
export function useUpdateRequired(): boolean {
  const { data } = useQuery({
    queryKey: ['min-app-version'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_config')
        .select('value')
        .eq('key', 'min_app_version')
        .maybeSingle();
      if (error) throw error;
      return data?.value ?? null;
    },
  });
  const current = Application.nativeApplicationVersion;
  // Offline, unknown or not configured: never lock the user out.
  return !!data && !!current && isOutdated(current, data);
}
