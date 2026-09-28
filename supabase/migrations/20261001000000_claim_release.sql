-- Step 5: take over (claim) and give back (release) occurrences, live updates.

-- Returns true if the caller got the occurrence, false if it was no longer open
-- (someone else was faster, it was cancelled, or the caller is not a member).
-- A single UPDATE ... WHERE status = 'open': when two people tap at the same time,
-- the second statement waits for the first row lock, re-checks the condition and
-- changes nothing.
create function public.claim_occurrence(p_occurrence_id uuid)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  update public.occurrences
     set assigned_to = auth.uid(), status = 'claimed', updated_at = now()
   where id = p_occurrence_id
     and status = 'open'
     and public.is_family_member(family_id);
  return found;
end;
$$;

-- Gives a claimed occurrence back. Allowed for the assigned person and parents.
-- Returns false if it was not claimed (anymore).
create function public.release_occurrence(p_occurrence_id uuid)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_occurrence public.occurrences;
begin
  select * into v_occurrence from public.occurrences where id = p_occurrence_id for update;
  if not found
     or not (v_occurrence.assigned_to = auth.uid()
             or public.is_family_parent(v_occurrence.family_id)) then
    raise exception 'only the assigned person or parents can release' using errcode = '42501';
  end if;

  update public.occurrences
     set assigned_to = null, status = 'open', updated_at = now()
   where id = p_occurrence_id
     and status = 'claimed';
  return found;
end;
$$;

revoke execute on function public.claim_occurrence(uuid) from public, anon;
revoke execute on function public.release_occurrence(uuid) from public, anon;
grant execute on function public.claim_occurrence(uuid) to authenticated;
grant execute on function public.release_occurrence(uuid) to authenticated;

-- Live updates: Realtime delivers changes only to users whose RLS allows reading the row.
alter publication supabase_realtime add table public.occurrences;
