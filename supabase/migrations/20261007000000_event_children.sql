-- Several children per event (decision 2026-09-30), e.g. both children to swimming, one driver.
-- Expand: child_ids holds all children in the chosen order. child_id stays the first one,
-- so app versions that only know child_id keep working: they write child_id and the
-- trigger fills child_ids; their embed children(...) still follows the child_id FK.

alter table public.events add column child_ids uuid[];
update public.events set child_ids = array[child_id];
alter table public.events alter column child_ids set not null;
alter table public.events add constraint events_child_ids_check
  check (cardinality(child_ids) between 1 and 10 and child_id = child_ids[1]);

-- Keeps child_id and child_ids in step and allows only children of the event's family.
-- Security invoker on purpose: children of other families are invisible (RLS), so they fail.
create function public.events_sync_children()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- runs before RLS: outsiders get the same "no permission" as without this trigger
  if auth.uid() is not null and not public.is_family_member(new.family_id) then
    raise exception 'not a member of this family' using errcode = '42501';
  end if;

  if new.child_ids is null or cardinality(new.child_ids) = 0
     or (tg_op = 'UPDATE' and new.child_ids = old.child_ids
         and new.child_id is distinct from old.child_id) then
    -- written by an app version that only knows child_id
    new.child_ids := array[new.child_id];
  else
    new.child_id := new.child_ids[1];
  end if;

  if (select count(distinct c) from unnest(new.child_ids) as c) <> cardinality(new.child_ids) then
    raise exception 'a child is listed twice' using errcode = '23514';
  end if;
  if exists (
    select 1 from unnest(new.child_ids) as c
     where not exists (
       select 1 from public.children ch where ch.id = c and ch.family_id = new.family_id)
  ) then
    raise exception 'child does not belong to this family' using errcode = '23503';
  end if;
  return new;
end;
$$;

create trigger events_sync_children
  before insert or update of child_id, child_ids, family_id on public.events
  for each row execute function public.events_sync_children();

-- Computed relationship for the app: events?select=...,event_children(first_name,color)
-- ponytail: deleting a child that is not the first of an event leaves its id in child_ids
-- (it is then simply not listed); the app has no "delete child" yet.
create function public.event_children(public.events)
returns setof public.children
language sql
stable
rows 10
set search_path = ''
as $$
  select c.* from public.children c
   where c.id = any($1.child_ids)
   order by array_position($1.child_ids, c.id);
$$;

-- "Lena, Tom" for push texts
create function public.child_names(p_child_ids uuid[])
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select string_agg(first_name, ', ' order by array_position(p_child_ids, id))
    from public.children
   where id = any(p_child_ids);
$$;

revoke execute on function public.child_names(uuid[]) from public, anon, authenticated;

-- "Schwimmen (Lena, Tom), Di 06.10., 15:00–16:00 Uhr, Hallenbad"
create or replace function public.describe_occurrence(p_occurrence_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select e.title || ' (' || public.child_names(e.child_ids) || '), '
      || (array['So','Mo','Di','Mi','Do','Fr','Sa'])[extract(dow from o.starts_at at time zone e.timezone)::int + 1]
      || ' ' || to_char(o.starts_at at time zone e.timezone, 'DD.MM., HH24:MI')
      || '–' || to_char(o.ends_at at time zone e.timezone, 'HH24:MI') || ' Uhr'
      || coalesce(', ' || nullif(e.location, ''), '')
    from public.occurrences o
    join public.events e on e.id = o.event_id
   where o.id = p_occurrence_id;
$$;

create or replace function public.notify_new_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_when text;
begin
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
    new.title || ' (' || public.child_names(new.child_ids) || '), ' || v_when || ', '
      || to_char(new.start_time, 'HH24:MI') || '–'
      || to_char(new.start_time + make_interval(mins => new.duration_min), 'HH24:MI') || ' Uhr'
      || coalesce(', ' || nullif(new.location, ''), '')
      || ' · angelegt von ' || public.actor_name(new.created_by));
  return new;
end;
$$;
