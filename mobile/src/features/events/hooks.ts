import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

type EventInsert = Database['public']['Tables']['events']['Insert'];

export function useChildren(familyId: string | undefined) {
  return useQuery({
    queryKey: ['children', familyId],
    enabled: !!familyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('children')
        .select('id, first_name, color')
        .eq('family_id', familyId!)
        .order('created_at');
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateChild() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (child: { family_id: string; first_name: string; color: string }) => {
      const { error } = await supabase.from('children').insert(child);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['children'] }),
  });
}

export function useEvents(familyId: string | undefined) {
  return useQuery({
    queryKey: ['events', familyId],
    enabled: !!familyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select(
          'id, title, kind, location, start_time, duration_min, rrule, first_date, until_date, timezone, children(first_name, color)',
        )
        .eq('family_id', familyId!)
        .order('first_date');
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (event: EventInsert) => {
      const { error } = await supabase.from('events').insert(event);
      if (error) throw error;
    },
    // The database generates the occurrences right away; show them in the calendar too.
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ['events'] }),
        queryClient.invalidateQueries({ queryKey: ['occurrences'] }),
      ]),
  });
}
