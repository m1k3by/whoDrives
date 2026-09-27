import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

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
