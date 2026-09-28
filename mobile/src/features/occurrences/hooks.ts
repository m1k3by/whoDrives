import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { supabase } from '@/lib/supabase';

/** Occurrences overlapping [from, to), sorted by start. */
export function useOccurrences(familyId: string | undefined, from: Date, to: Date) {
  const range = [from.toISOString(), to.toISOString()] as const;
  return useQuery({
    queryKey: ['occurrences', familyId, ...range],
    enabled: !!familyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('occurrences')
        .select(
          'id, starts_at, ends_at, status, assigned_to, profiles(display_name), events(title, kind, location, children(first_name, color))',
        )
        .eq('family_id', familyId!)
        .gte('ends_at', range[0])
        .lt('starts_at', range[1])
        .order('starts_at');
      if (error) throw error;
      return data;
    },
  });
}

export type Occurrence = NonNullable<ReturnType<typeof useOccurrences>['data']>[number];

/** Keeps all occurrence lists up to date while the app shows the family. */
export function useLiveOccurrences(familyId: string | undefined) {
  const queryClient = useQueryClient();
  useEffect(() => {
    if (!familyId) return;
    const channel = supabase
      .channel(`occurrences-${familyId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'occurrences', filter: `family_id=eq.${familyId}` },
        () => queryClient.invalidateQueries({ queryKey: ['occurrences'] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [familyId, queryClient]);
}

/** Someone else was faster (or it was cancelled in the meantime). */
export class AlreadyTakenError extends Error {}

export function useClaimOccurrence() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (occurrenceId: string) => {
      const { data, error } = await supabase.rpc('claim_occurrence', {
        p_occurrence_id: occurrenceId,
      });
      if (error) throw error;
      if (!data) throw new AlreadyTakenError();
    },
    // Also after "already taken": show who has it now.
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['occurrences'] }),
  });
}

export function useReleaseOccurrence() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (occurrenceId: string) => {
      const { error } = await supabase.rpc('release_occurrence', {
        p_occurrence_id: occurrenceId,
      });
      if (error) throw error;
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['occurrences'] }),
  });
}

export function useCancelOccurrence() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (occurrenceId: string) => {
      const { error } = await supabase.rpc('cancel_occurrence', {
        p_occurrence_id: occurrenceId,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['occurrences'] }),
  });
}
