import { FunctionsHttpError } from '@supabase/supabase-js';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

export type FamilyRole = Database['public']['Enums']['family_role'];

/** "ABCDEFGH" -> "ABCD-EFGH" (easier to read out and type) */
export const formatInviteCode = (code: string) => `${code.slice(0, 4)}-${code.slice(4)}`;

export function useCreateInvite() {
  return useMutation({
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
