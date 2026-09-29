import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useMyProfile } from '@/features/profile/hooks';
import { supabase } from '@/lib/supabase';

const familyKey = ['my-family'] as const;

/** The user's family with members (Phase 1: one family per user), or null. */
export function useMyFamily() {
  return useQuery({
    queryKey: familyKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('families')
        .select('id, name, family_members(user_id, role, profiles(display_name))')
        .order('created_at')
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

/** My family and my user id (both queries are cached). */
export function useMyMembership() {
  const profile = useMyProfile();
  const family = useMyFamily();
  return { family: family.data, myId: profile.data?.id };
}

export function useRemoveMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ familyId, userId }: { familyId: string; userId: string }) => {
      const { error, count } = await supabase
        .from('family_members')
        .delete({ count: 'exact' })
        .eq('family_id', familyId)
        .eq('user_id', userId);
      if (error) throw error;
      // RLS silently deletes nothing when not allowed
      if (count === 0) throw new Error('not allowed');
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: familyKey }),
  });
}

export function useCreateFamily() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      // No RETURNING: the creator only becomes a member (and may read the row)
      // after the insert trigger has run.
      const { error } = await supabase.from('families').insert({ name: name.trim() });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: familyKey }),
  });
}
