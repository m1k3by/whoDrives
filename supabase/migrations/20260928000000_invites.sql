-- Step 2: invites. Only the SHA-256 hash of a code is stored.
-- Create: parents via create_invite(). Redeem: only via Edge Function redeem-invite,
-- which calls redeem_invite() with service rights.

create table public.invites (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  token_hash text not null unique,
  role public.family_role not null,
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days',
  used_at timestamptz,
  used_by uuid references public.profiles (id) on delete set null
);

create index invites_family_id_idx on public.invites (family_id);

alter table public.invites enable row level security;

-- Parents read the invites of their family. No insert/update/delete policies:
-- writes only happen inside the security definer functions below.
create policy "invites_select_parents" on public.invites
  for select to authenticated
  using (public.is_family_parent(family_id));

-- Normalizes user input ("abcd-efgh " -> "ABCDEFGH") and hashes it.
create function public.invite_code_hash(p_code text)
returns text
language sql
immutable
set search_path = ''
as $$
  select encode(
    extensions.digest(upper(regexp_replace(p_code, '[^A-Za-z0-9]', '', 'g')), 'sha256'),
    'hex'
  );
$$;

-- Parent creates an invite; the plain code is returned exactly once.
create function public.create_invite(p_family_id uuid, p_role public.family_role)
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
  if not public.is_family_parent(p_family_id) then
    raise exception 'only parents can invite' using errcode = '42501';
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

-- Redeems a code for a user. Called only by the Edge Function (service role).
-- Returns the family id; raises 'invalid_invite' for unknown, used or expired codes.
create function public.redeem_invite(p_code text, p_user_id uuid)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_invite public.invites;
begin
  select * into v_invite
    from public.invites
   where token_hash = public.invite_code_hash(p_code)
     for update; -- two people redeeming the same code at once: the second one waits and fails

  if not found or v_invite.used_at is not null or v_invite.expires_at < now() then
    raise exception 'invalid_invite';
  end if;

  insert into public.family_members (family_id, user_id, role)
  values (v_invite.family_id, p_user_id, v_invite.role)
  on conflict (family_id, user_id) do nothing;

  update public.invites
     set used_at = now(), used_by = p_user_id
   where id = v_invite.id;

  return v_invite.family_id;
end;
$$;

revoke execute on function public.create_invite(uuid, public.family_role) from public, anon;
grant execute on function public.create_invite(uuid, public.family_role) to authenticated;

revoke execute on function public.redeem_invite(text, uuid) from public, anon, authenticated;
grant execute on function public.redeem_invite(text, uuid) to service_role;
