-- Everybody sees everything: a claim is announced to all family members
-- (was: parents only), except the person who claimed it.
create or replace function public.notify_claim()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text;
begin
  select coalesce(nullif(display_name, ''), 'Jemand') into v_name
    from public.profiles where id = new.assigned_to;
  perform public.enqueue_notification(
    public.family_member_ids(new.family_id, false, new.assigned_to),
    'Termin übernommen',
    v_name || ' übernimmt: ' || public.describe_occurrence(new.id));
  return new;
end;
$$;
