-- Baseline: profiles, families, family_members, app_config
-- RLS on every table; default is "no access".

create type public.family_role as enum ('parent', 'grandparent', 'other');

-- profiles ------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 50),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- families ------------------------------------------------------------------

create table public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 50),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

-- family_members ------------------------------------------------------------

create table public.family_members (
  family_id uuid not null references public.families (id) on delete cascade,
  -- references profiles (not auth.users) so the API can embed profiles in member lists
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.family_role not null,
  created_at timestamptz not null default now(),
  primary key (family_id, user_id)
);

create index family_members_user_id_idx on public.family_members (user_id);

-- app_config ----------------------------------------------------------------

create table public.app_config (
  key text primary key,
  value text not null
);

insert into public.app_config (key, value) values ('min_app_version', '1.0.0');

-- helper functions (security definer: bypass RLS to avoid policy recursion) --

create function public.is_family_member(p_family_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.family_members
     where family_id = p_family_id
       and user_id = auth.uid()
  );
$$;

create function public.is_family_parent(p_family_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.family_members
     where family_id = p_family_id
       and user_id = auth.uid()
       and role = 'parent'
  );
$$;

revoke execute on function public.is_family_member(uuid) from public, anon;
revoke execute on function public.is_family_parent(uuid) from public, anon;
grant execute on function public.is_family_member(uuid) to authenticated;
grant execute on function public.is_family_parent(uuid) to authenticated;

-- triggers ------------------------------------------------------------------

-- New auth user -> empty profile
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- New family -> creator becomes parent
create function public.handle_new_family()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.family_members (family_id, user_id, role)
  values (new.id, new.created_by, 'parent');
  return new;
end;
$$;

create trigger on_family_created
  after insert on public.families
  for each row execute function public.handle_new_family();

-- RLS -----------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.families enable row level security;
alter table public.family_members enable row level security;
alter table public.app_config enable row level security;

-- profiles: read own and those of shared families; write only own
create policy "profiles_select_own_or_shared_family" on public.profiles
  for select to authenticated
  using (
    id = auth.uid()
    or exists (
      select 1
        from public.family_members me
        join public.family_members other using (family_id)
       where me.user_id = auth.uid()
         and other.user_id = profiles.id
    )
  );

create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- families: members read; any logged-in user creates (as themselves).
-- Note: the creator only becomes a member in the AFTER trigger, so the app
-- inserts without RETURNING and refetches afterwards.
create policy "families_select_members" on public.families
  for select to authenticated
  using (public.is_family_member(id));

create policy "families_insert_self" on public.families
  for insert to authenticated
  with check (created_by = auth.uid());

-- family_members: members of the same family read.
-- Insert only via invite function (service role) or the family trigger.
-- Delete: leave yourself, or removal by a parent.
create policy "family_members_select_members" on public.family_members
  for select to authenticated
  using (public.is_family_member(family_id));

create policy "family_members_delete_self_or_parent" on public.family_members
  for delete to authenticated
  using (user_id = auth.uid() or public.is_family_parent(family_id));

-- app_config: readable by everyone (also before login), no writes
create policy "app_config_select_all" on public.app_config
  for select to anon, authenticated
  using (true);
