import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { unregisterPush } from '@/features/push/register';
import { supabase } from '@/lib/supabase';

const profileKey = ['my-profile'] as const;

export function useMyProfile() {
  return useQuery({
    queryKey: profileKey,
    queryFn: async () => {
      // Local session instead of getUser(): no extra round trip to the auth server.
      // (Only used for display; the database checks the token itself via RLS.)
      const { data: auth } = await supabase.auth.getSession();
      if (!auth.session) throw new Error('not logged in');
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name')
        .eq('id', auth.session.user.id)
        .single();
      if (error) throw error;
      return { ...data, email: auth.session.user.email ?? '' };
    },
  });
}

export function useUpdateDisplayName() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ display_name: name.trim() })
        .eq('id', id);
      if (error) throw error;
    },
    // The name shows up in the profile, the member list and at claimed occurrences.
    onSuccess: () =>
      Promise.all(
        [['my-profile'], ['my-family'], ['occurrences']].map((queryKey) =>
          queryClient.invalidateQueries({ queryKey }),
        ),
      ),
  });
}

/** Deletes the account on the server, then clears the session on this device. */
export function useDeleteAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.functions.invoke('delete-account');
      if (error) throw error;
      // The session is invalid now; only clear it locally.
      await supabase.auth.signOut({ scope: 'local' });
      queryClient.clear();
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return async () => {
    await unregisterPush().catch(() => {}); // offline: logout must still work
    await supabase.auth.signOut();
    // Never show the previous user's cached data to the next one.
    queryClient.clear();
  };
}
