-- Reminders (decision 2026-09-30), same times for everybody:
--   3 days before: still open -> all members
--   1 day before:  still open -> all members, taken -> the assigned person
--   1 hour before: still open -> all members, taken -> the assigned person
-- Replaces the "evening before from 18:00" message. Only the latest stage that is due is
-- sent (no burst after a cron outage). A stage is skipped for occurrences created after it
-- was due: the "new event" message already covers those.
create or replace function public.enqueue_scheduled_notifications(p_now timestamptz default now())
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  o record;
begin
  for o in
    select occ.id, occ.family_id, occ.status, occ.assigned_to, s.stage
      from public.occurrences occ
      cross join lateral (
        select v.stage, v.lead
          from (values ('1h', interval '1 hour'), ('1d', interval '1 day'), ('3d', interval '3 days'))
               as v (stage, lead)
         where occ.starts_at - v.lead <= p_now
         order by v.lead
         limit 1) s
     where occ.starts_at > p_now
       and occ.starts_at <= p_now + interval '3 days'
       and occ.created_at <= occ.starts_at - s.lead
       and (occ.status = 'open'
            or (occ.status = 'claimed' and occ.assigned_to is not null and s.stage <> '3d'))
  loop
    if o.status = 'open' then
      perform public.enqueue_notification(
        public.family_member_ids(o.family_id, false, null),
        case o.stage when '3d' then 'In 3 Tagen noch offen – wer kann?'
                     when '1d' then 'Morgen noch offen – wer kann?'
                     else 'In 1 Stunde noch offen – wer kann?' end,
        public.describe_occurrence(o.id),
        'open' || o.stage || ':' || o.id);
    else
      perform public.enqueue_notification(
        array[o.assigned_to],
        case o.stage when '1d' then 'Morgen bist du dran' else 'Gleich geht''s los' end,
        public.describe_occurrence(o.id),
        -- 'reminder:' as before, so the switch does not send the 1-hour reminder twice
        case o.stage when '1d' then 'claimed1d:' else 'reminder:' end || o.id);
    end if;
  end loop;
end;
$$;

revoke execute on function public.enqueue_scheduled_notifications(timestamptz) from public, anon, authenticated;
