-- More detailed push messages (decision 2026-09-29): time range, location, who did it.
-- New occasions: an occurrence is released again, an occurrence is cancelled.

-- Display name of a user, "Jemand" if unknown or empty
create function public.actor_name(p_user_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select nullif(display_name, '') from public.profiles where id = p_user_id), 'Jemand');
$$;

-- "Reiten (Lena), Di 06.10., 15:00–16:00 Uhr, Reitstall Sonnenhof"
create or replace function public.describe_occurrence(p_occurrence_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select e.title || ' (' || c.first_name || '), '
      || (array['So','Mo','Di','Mi','Do','Fr','Sa'])[extract(dow from o.starts_at at time zone e.timezone)::int + 1]
      || ' ' || to_char(o.starts_at at time zone e.timezone, 'DD.MM., HH24:MI')
      || '–' || to_char(o.ends_at at time zone e.timezone, 'HH24:MI') || ' Uhr'
      || coalesce(', ' || nullif(e.location, ''), '')
    from public.occurrences o
    join public.events e on e.id = o.event_id
    join public.children c on c.id = e.child_id
   where o.id = p_occurrence_id;
$$;

create or replace function public.notify_new_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_child text;
  v_when text;
begin
  select first_name into v_child from public.children where id = new.child_id;
  if new.rrule is null then
    v_when := (array['So','Mo','Di','Mi','Do','Fr','Sa'])[extract(dow from new.first_date)::int + 1]
           || ' ' || to_char(new.first_date, 'DD.MM.');
  else
    v_when := 'jeden ' || (
      select string_agg(
               (array['Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag','Sonntag'])
                 [array_position(array['MO','TU','WE','TH','FR','SA','SU'], day)], ', ')
        from unnest(string_to_array(replace(new.rrule, 'FREQ=WEEKLY;BYDAY=', ''), ',')) as day);
  end if;
  perform public.enqueue_notification(
    public.family_member_ids(new.family_id, false, new.created_by),
    'Neuer Termin – wer kann?',
    new.title || ' (' || v_child || '), ' || v_when || ', '
      || to_char(new.start_time, 'HH24:MI') || '–'
      || to_char(new.start_time + make_interval(mins => new.duration_min), 'HH24:MI') || ' Uhr'
      || coalesce(', ' || nullif(new.location, ''), '')
      || ' · angelegt von ' || public.actor_name(new.created_by));
  return new;
end;
$$;

-- Released again -> everybody except the person who released it
create function public.notify_release()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.enqueue_notification(
    public.family_member_ids(new.family_id, false, auth.uid()),
    'Wieder offen – wer übernimmt?',
    case when old.assigned_to = auth.uid()
         then public.actor_name(old.assigned_to) || ' kann doch nicht: '
         else public.actor_name(auth.uid()) || ' hat die Zusage von '
              || public.actor_name(old.assigned_to) || ' aufgehoben: '
    end || public.describe_occurrence(new.id));
  return new;
end;
$$;

create trigger on_occurrence_released_notify
  after update of status on public.occurrences
  for each row
  when (old.status = 'claimed' and new.status = 'open')
  execute function public.notify_release();

-- Cancelled -> everybody except the person who cancelled it
create function public.notify_cancel()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.enqueue_notification(
    public.family_member_ids(new.family_id, false, auth.uid()),
    'Termin abgesagt',
    public.actor_name(auth.uid()) || ' hat abgesagt: ' || public.describe_occurrence(new.id));
  return new;
end;
$$;

create trigger on_occurrence_cancelled_notify
  after update of status on public.occurrences
  for each row
  when (old.status <> 'cancelled' and new.status = 'cancelled')
  execute function public.notify_cancel();

revoke execute on function public.actor_name(uuid) from public, anon, authenticated;
