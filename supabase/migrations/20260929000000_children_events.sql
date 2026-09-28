-- Step 3: children and event rules. Members read, only parents write.

create type public.event_kind as enum ('ride', 'pickup', 'care', 'other');

-- children: data-minimal on purpose (first name and color only)
create table public.children (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  first_name text not null check (char_length(trim(first_name)) between 1 and 30),
  color text not null check (color ~ '^#[0-9A-Fa-f]{6}$'),
  created_at timestamptz not null default now(),
  -- target for the composite FK below: an event can only point to a child of its own family
  unique (id, family_id)
);

create index children_family_id_idx on public.children (family_id);

-- events: the rule ("Reiten, jeden Dienstag 15 Uhr"); concrete dates come in step 4
create table public.events (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  child_id uuid not null,
  title text not null check (char_length(trim(title)) between 1 and 60),
  kind public.event_kind not null default 'other',
  location text check (char_length(location) <= 100),
  start_time time not null,
  duration_min integer not null default 60 check (duration_min between 5 and 1440),
  timezone text not null default 'Europe/Berlin',
  -- null = one-off. For now only weekly rules on fixed weekdays; loosening this
  -- check later is backward compatible, the step 4 generator relies on it.
  rrule text check (
    rrule ~ '^FREQ=WEEKLY;BYDAY=(MO|TU|WE|TH|FR|SA|SU)(,(MO|TU|WE|TH|FR|SA|SU))*$'
  ),
  first_date date not null,
  until_date date check (until_date >= first_date),
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  foreign key (child_id, family_id) references public.children (id, family_id)
);

create index events_family_id_idx on public.events (family_id);

-- RLS ---------------------------------------------------------------------------

alter table public.children enable row level security;
alter table public.events enable row level security;

create policy "children_select_members" on public.children
  for select to authenticated using (public.is_family_member(family_id));
create policy "children_insert_parents" on public.children
  for insert to authenticated with check (public.is_family_parent(family_id));
create policy "children_update_parents" on public.children
  for update to authenticated
  using (public.is_family_parent(family_id))
  with check (public.is_family_parent(family_id));
create policy "children_delete_parents" on public.children
  for delete to authenticated using (public.is_family_parent(family_id));

create policy "events_select_members" on public.events
  for select to authenticated using (public.is_family_member(family_id));
create policy "events_insert_parents" on public.events
  for insert to authenticated with check (public.is_family_parent(family_id));
create policy "events_update_parents" on public.events
  for update to authenticated
  using (public.is_family_parent(family_id))
  with check (public.is_family_parent(family_id));
create policy "events_delete_parents" on public.events
  for delete to authenticated using (public.is_family_parent(family_id));
