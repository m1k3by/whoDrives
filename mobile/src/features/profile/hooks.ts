import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { unregisterPush } from '@/features/push/register';
import { supabase } from '@/lib/supabase';

const profileKey = ['my-profile'] as const;

export function useMyProfile() {
  return useQuery({
    queryKey: profileKey,
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error('not logged in');
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name')
        .eq('id', auth.user.id)
        .single();
      if (error) throw error;
      return { ...data, email: auth.user.email ?? '' };
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
    // The name also shows up in the family member list.
    onSuccess: () => queryClient.invalidateQueries(),
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
