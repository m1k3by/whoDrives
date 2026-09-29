-- Decision 2026-09-29: all family members have the same rights. The role
-- (parent, grandparent, other) is only a label. Everything that was parent-only
-- is now allowed for every member of the family; other families stay locked out.

-- children, events -------------------------------------------------------------------------
drop policy "children_insert_parents" on public.children;
drop policy "children_update_parents" on public.children;
drop policy "children_delete_parents" on public.children;
create policy "children_insert_members" on public.children
  for insert to authenticated with check (public.is_family_member(family_id));
create policy "children_update_members" on public.children
  for update to authenticated
  using (public.is_family_member(family_id))
  with check (public.is_family_member(family_id));
create policy "children_delete_members" on public.children
  for delete to authenticated using (public.is_family_member(family_id));

drop policy "events_insert_parents" on public.events;
drop policy "events_update_parents" on public.events;
drop policy "events_delete_parents" on public.events;
create policy "events_insert_members" on public.events
  for insert to authenticated with check (public.is_family_member(family_id));
create policy "events_update_members" on public.events
  for update to authenticated
  using (public.is_family_member(family_id))
  with check (public.is_family_member(family_id));
create policy "events_delete_members" on public.events
  for delete to authenticated using (public.is_family_member(family_id));

-- family_members: every member can remove members of the own family ----------------------
drop policy "family_members_delete_self_or_parent" on public.family_members;
create policy "family_members_delete_members" on public.family_members
  for delete to authenticated using (public.is_family_member(family_id));

-- invites: every member sees, creates and revokes ------------------------------------------
drop policy "invites_select_parents" on public.invites;
drop policy "invites_delete_parents" on public.invites;
create policy "invites_select_members" on public.invites
  for select to authenticated using (public.is_family_member(family_id));
create policy "invites_delete_members" on public.invites
  for delete to authenticated using (public.is_family_member(family_id));

create or replace function public.create_invite(p_family_id uuid, p_role public.family_role)
returns table (code text, expires_at timestamptz)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  -- No 0/O, 1/I/L: codes are read out loud and typed by grandparents.
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  v_code text := '';
  v_byte int;
  v_expires timestamptz := now() + interval '7 days';
begin
  if not public.is_family_member(p_family_id) then
    raise exception 'only members can invite' using errcode = '42501';
  end if;

  while length(v_code) < 8 loop
    v_byte := get_byte(extensions.gen_random_bytes(1), 0);
    -- 248 = 31 * 8: reject higher bytes so every character is equally likely
    if v_byte < 248 then
      v_code := v_code || substr(alphabet, v_byte % 31 + 1, 1);
    end if;
  end loop;

  insert into public.invites (family_id, token_hash, role, created_by, expires_at)
  values (p_family_id, public.invite_code_hash(v_code), p_role, auth.uid(), v_expires);

  return query select v_code, v_expires;
end;
$$;

-- occurrences: every member cancels and releases ----------------------------------------
create or replace function public.cancel_occurrence(p_occurrence_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_family_id uuid;
begin
  select family_id into v_family_id from public.occurrences where id = p_occurrence_id;
  if v_family_id is null or not public.is_family_member(v_family_id) then
    raise exception 'only members can cancel' using errcode = '42501';
  end if;
  update public.occurrences
     set status = 'cancelled', updated_at = now()
   where id = p_occurrence_id;
end;
$$;

create or replace function public.release_occurrence(p_occurrence_id uuid)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_family_id uuid;
begin
  select family_id into v_family_id from public.occurrences where id = p_occurrence_id for update;
  if v_family_id is null or not public.is_family_member(v_family_id) then
    raise exception 'only members can release' using errcode = '42501';
  end if;

  update public.occurrences
     set assigned_to = null, status = 'open', updated_at = now()
   where id = p_occurrence_id
     and status = 'claimed';
  return found;
end;
$$;

-- No longer used anywhere
drop function public.is_family_parent(uuid);
