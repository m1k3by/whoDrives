-- Step 6: push notifications.
-- Triggers and a scheduled job write messages into notification_outbox; the Edge
-- Function notify sends them via the Expo push service (called every minute by pg_cron).

create extension if not exists pg_net;

-- push_tokens ---------------------------------------------------------------------------

create table public.push_tokens (
  token text primary key check (token ~ '^Expo(nent)?PushToken\[.+\]$'),
  user_id uuid not null references public.profiles (id) on delete cascade,
  platform text not null check (platform in ('android', 'ios')),
  updated_at timestamptz not null default now()
);

create index push_tokens_user_id_idx on public.push_tokens (user_id);

alter table public.push_tokens enable row level security;

-- Own tokens only. Writes go through the functions below, because a device token can
-- move to another account (logout on a shared phone).
create policy "push_tokens_select_own" on public.push_tokens
  for select to authenticated using (user_id = auth.uid());
create policy "push_tokens_delete_own" on public.push_tokens
  for delete to authenticated using (user_id = auth.uid());

create function public.register_push_token(p_token text, p_platform text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not logged in' using errcode = '42501';
  end if;
  insert into public.push_tokens (token, user_id, platform, updated_at)
  values (p_token, auth.uid(), p_platform, now())
  on conflict (token) do update
     set user_id = excluded.user_id, platform = excluded.platform, updated_at = now();
end;
$$;

revoke execute on function public.register_push_token(text, text) from public, anon;
grant execute on function public.register_push_token(text, text) to authenticated;

-- notification_outbox -------------------------------------------------------------------

create table public.notification_outbox (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  body text not null,
  -- set for scheduled messages, so every job run can safely re-check
  dedupe_key text unique,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create index notification_outbox_unsent_idx on public.notification_outbox (created_at)
  where sent_at is null;

-- RLS on, no policies: only security definer functions and the Edge Function (service role).
alter table public.notification_outbox enable row level security;

create function public.enqueue_notification(
  p_user_ids uuid[], p_title text, p_body text, p_dedupe_prefix text default null)
returns void
language sql
volatile
security definer
set search_path = ''
as $$
  insert into public.notification_outbox (user_id, title, body, dedupe_key)
  select u, p_title, p_body, p_dedupe_prefix || ':' || u
    from unnest(p_user_ids) as u
  on conflict (dedupe_key) do nothing;
$$;

-- "Reiten (Lena), Di 06.10., 15:00 Uhr" in the event's timezone
create function public.describe_occurrence(p_occurrence_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select e.title || ' (' || c.first_name || '), '
      || (array['So','Mo','Di','Mi','Do','Fr','Sa'])[extract(dow from o.starts_at at time zone e.timezone)::int + 1]
      || ' ' || to_char(o.starts_at at time zone e.timezone, 'DD.MM., HH24:MI') || ' Uhr'
    from public.occurrences o
    join public.events e on e.id = o.event_id
    join public.children c on c.id = e.child_id
   where o.id = p_occurrence_id;
$$;

-- Member ids of a family, optionally parents only, without one user
create function public.family_member_ids(p_family_id uuid, p_parents_only boolean, p_except uuid)
returns uuid[]
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(array_agg(user_id), '{}')
    from public.family_members
   where family_id = p_family_id
     and (not p_parents_only or role = 'parent')
     and user_id is distinct from p_except;
$$;

-- Trigger: new event -> everybody except the creator
create function public.notify_new_event()
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
    new.title || ' (' || v_child || '), ' || v_when || ', ' || to_char(new.start_time, 'HH24:MI') || ' Uhr');
  return new;
end;
$$;

create trigger on_event_created_notify
  after insert on public.events
  for each row execute function public.notify_new_event();

-- Trigger: occurrence claimed -> parents (except the person who claimed it)
create function public.notify_claim()
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
    public.family_member_ids(new.family_id, true, new.assigned_to),
    'Termin übernommen',
    v_name || ' übernimmt: ' || public.describe_occurrence(new.id));
  return new;
end;
$$;

create trigger on_occurrence_claimed_notify
  after update of status on public.occurrences
  for each row
  when (old.status = 'open' and new.status = 'claimed')
  execute function public.notify_claim();

-- Scheduled: evening before (from 18:00 local time) open occurrences of tomorrow -> all
-- members; one hour before a claimed occurrence -> the assigned person.
-- p_now only exists for tests.
create function public.enqueue_scheduled_notifications(p_now timestamptz default now())
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
    select occ.id, occ.family_id
      from public.occurrences occ
      join public.events e on e.id = occ.event_id
     where occ.status = 'open'
       and (occ.starts_at at time zone e.timezone)::date = (p_now at time zone e.timezone)::date + 1
       and (p_now at time zone e.timezone)::time >= '18:00'
  loop
    perform public.enqueue_notification(
      public.family_member_ids(o.family_id, false, null),
      'Morgen noch offen – wer übernimmt?',
      public.describe_occurrence(o.id),
      'evening:' || o.id);
  end loop;

  for o in
    select occ.id, occ.assigned_to
      from public.occurrences occ
     where occ.status = 'claimed'
       and occ.assigned_to is not null
       and occ.starts_at > p_now
       and occ.starts_at <= p_now + interval '1 hour'
  loop
    perform public.enqueue_notification(
      array[o.assigned_to],
      'Gleich geht''s los',
      public.describe_occurrence(o.id),
      'reminder:' || o.id);
  end loop;
end;
$$;

-- Calls the Edge Function notify if something is waiting. Needs two Vault secrets
-- (set once per environment, never in the repo): project_url, notify_secret_key.
create function public.deliver_notifications()
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_url text;
  v_key text;
begin
  if not exists (select 1 from public.notification_outbox where sent_at is null) then
    return;
  end if;
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'project_url';
  select decrypted_secret into v_key from vault.decrypted_secrets where name = 'notify_secret_key';
  if v_url is null or v_key is null then
    raise warning 'deliver_notifications: vault secrets project_url / notify_secret_key missing';
    return;
  end if;
  perform net.http_post(
    url := v_url || '/functions/v1/notify',
    headers := jsonb_build_object('Content-Type', 'application/json', 'apikey', v_key),
    body := '{}'::jsonb);
end;
$$;

revoke execute on function public.enqueue_notification(uuid[], text, text, text) from public, anon, authenticated;
revoke execute on function public.describe_occurrence(uuid) from public, anon, authenticated;
revoke execute on function public.family_member_ids(uuid, boolean, uuid) from public, anon, authenticated;
revoke execute on function public.enqueue_scheduled_notifications(timestamptz) from public, anon, authenticated;
revoke execute on function public.deliver_notifications() from public, anon, authenticated;

select cron.schedule('enqueue-notifications', '*/5 * * * *', 'select public.enqueue_scheduled_notifications()');
select cron.schedule('deliver-notifications', '* * * * *', 'select public.deliver_notifications()');
