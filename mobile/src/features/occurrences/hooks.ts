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

/**
 * Changes an occurrence in every cached list right away (the tap feels instant),
 * rolls back if the server refuses, and refetches afterwards to get the real state.
 */
function useOptimisticOccurrence(
  call: (occurrenceId: string) => Promise<void>,
  patch: Partial<Occurrence>,
) {
  const queryClient = useQueryClient();
  const key = ['occurrences'];
  return useMutation({
    mutationFn: call,
    onMutate: async (occurrenceId: string) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueriesData<Occurrence[]>({ queryKey: key });
      queryClient.setQueriesData<Occurrence[]>({ queryKey: key }, (list) =>
        list?.map((o) => (o.id === occurrenceId ? { ...o, ...patch } : o)),
      );
      return { previous };
    },
    onError: (_error, _id, context) =>
      context?.previous.forEach(([queryKey, data]) => queryClient.setQueryData(queryKey, data)),
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });
}

export function useClaimOccurrence(myId: string | undefined) {
  return useOptimisticOccurrence(
    async (occurrenceId) => {
      const { data, error } = await supabase.rpc('claim_occurrence', {
        p_occurrence_id: occurrenceId,
      });
      if (error) throw error;
      if (!data) throw new AlreadyTakenError();
    },
    { status: 'claimed', assigned_to: myId ?? null },
  );
}

export function useReleaseOccurrence() {
  return useOptimisticOccurrence(
    async (occurrenceId) => {
      const { error } = await supabase.rpc('release_occurrence', {
        p_occurrence_id: occurrenceId,
      });
      if (error) throw error;
    },
    { status: 'open', assigned_to: null, profiles: null },
  );
}

export function useCancelOccurrence() {
  return useOptimisticOccurrence(
    async (occurrenceId) => {
      const { error } = await supabase.rpc('cancel_occurrence', {
        p_occurrence_id: occurrenceId,
      });
      if (error) throw error;
    },
    { status: 'cancelled' },
  );
}
