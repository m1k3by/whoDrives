-- The month calendar can be browsed a year ahead: precompute 12 months instead of 8 weeks.

create or replace function public.generate_occurrences()
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  e record;
  v_today date;
begin
  for e in select id, timezone from public.events loop
    v_today := (now() at time zone e.timezone)::date;
    perform public.generate_occurrences_for(e.id, v_today, v_today + 365);
  end loop;
end;
$$;

create or replace function public.handle_event_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_today date := (now() at time zone new.timezone)::date;
begin
  if tg_op = 'UPDATE' then
    delete from public.occurrences
     where event_id = new.id
       and status = 'open'
       and assigned_to is null
       and starts_at > now();
  end if;
  perform public.generate_occurrences_for(new.id, v_today, v_today + 365);
  return new;
end;
$$;

select public.generate_occurrences();
