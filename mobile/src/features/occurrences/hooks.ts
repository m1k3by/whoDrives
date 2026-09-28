import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

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
          'id, starts_at, ends_at, status, events(title, kind, location, children(first_name, color))',
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
