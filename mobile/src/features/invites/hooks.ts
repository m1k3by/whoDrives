import { FunctionsHttpError } from '@supabase/supabase-js';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

export type FamilyRole = Database['public']['Enums']['family_role'];

/** "ABCDEFGH" -> "ABCD-EFGH" (easier to read out and type) */
export const formatInviteCode = (code: string) => `${code.slice(0, 4)}-${code.slice(4)}`;

/** Open invites (not used, not expired) of the family; RLS shows them to parents only. */
export function useOpenInvites(familyId: string) {
  return useQuery({
    queryKey: ['invites', familyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invites')
        .select('id, role, expires_at')
        .eq('family_id', familyId!)
        .is('used_at', null)
        .gt('expires_at', new Date().toISOString())
        .order('created_at');
      if (error) throw error;
      return data;
    },
  });
}

export function useRevokeInvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (inviteId: string) => {
      const { error, count } = await supabase
        .from('invites')
        .delete({ count: 'exact' })
        .eq('id', inviteId);
      if (error) throw error;
      if (count === 0) throw new Error('not allowed');
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['invites'] }),
  });
}

export function useCreateInvite() {
  const queryClient = useQueryClient();
  return useMutation({
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['invites'] }),
    mutationFn: async ({ familyId, role }: { familyId: string; role: FamilyRole }) => {
      const { data, error } = await supabase.rpc('create_invite', {
        p_family_id: familyId,
        p_role: role,
      });
      if (error) throw error;
      return data[0];
    },
  });
}

export class InvalidInviteError extends Error {}

export function useRedeemInvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (code: string) => {
      const { error } = await supabase.functions.invoke('redeem-invite', { body: { code } });
      if (error instanceof FunctionsHttpError && error.context.status === 400) {
        throw new InvalidInviteError();
      }
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries(),
  });
}
