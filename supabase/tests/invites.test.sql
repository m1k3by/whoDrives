begin;
select plan(17);

-- Fixtures: family A (parent a, grandparent b), family B (parent c), newcomers d, e
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'parent-a@test.local'),
  ('00000000-0000-0000-0000-0000000000b1', 'grandparent-a@test.local'),
  ('00000000-0000-0000-0000-0000000000c1', 'parent-b@test.local'),
  ('00000000-0000-0000-0000-0000000000d1', 'newcomer-d@test.local'),
  ('00000000-0000-0000-0000-0000000000e1', 'newcomer-e@test.local');

insert into public.families (id, name, created_by) values
  ('a1000000-0000-0000-0000-000000000000', 'Familie A', '00000000-0000-0000-0000-0000000000a1'),
  ('b1000000-0000-0000-0000-000000000000', 'Familie B', '00000000-0000-0000-0000-0000000000c1');

insert into public.family_members (family_id, user_id, role) values
  ('a1000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-0000000000b1', 'grandparent');

create temp table codes (name text primary key, code text);
grant all on codes to authenticated, service_role;

-- Creating invites ------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1"}', true);

insert into codes select 'valid', code from public.create_invite('a1000000-0000-0000-0000-000000000000', 'grandparent');
insert into codes select 'used', code from public.create_invite('a1000000-0000-0000-0000-000000000000', 'other');
insert into codes select 'expired', code from public.create_invite('a1000000-0000-0000-0000-000000000000', 'other');

select matches(
  (select code from codes where name = 'valid'),
  '^[ABCDEFGHJKMNPQRSTUVWXYZ2-9]{8}$',
  'code has 8 characters without confusable ones');

select is(
  (select count(*)::int from public.invites where token_hash = (select code from codes where name = 'valid')),
  0, 'plain code is not stored');

select is(
  (select count(*)::int from public.invites
    where token_hash = encode(extensions.digest((select code from codes where name = 'valid'), 'sha256'), 'hex')),
  1, 'SHA-256 hash of the code is stored');

select is(
  (select expires_at::date from public.invites order by created_at limit 1),
  (now() + interval '7 days')::date, 'invite is valid for 7 days');

select is((select count(*)::int from public.invites), 3, 'parent sees the family invites');

select throws_ok(
  $$insert into public.invites (family_id, token_hash, role)
    values ('a1000000-0000-0000-0000-000000000000', 'x', 'parent')$$,
  '42501', null, 'invites cannot be inserted directly');

select throws_ok(
  $$select public.redeem_invite((select code from codes where name = 'valid'), auth.uid())$$,
  '42501', null, 'app users cannot call redeem_invite directly (only the Edge Function)');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1"}', true);
select throws_ok(
  $$select * from public.create_invite('a1000000-0000-0000-0000-000000000000', 'parent')$$,
  '42501', null, 'grandparent cannot create invites');
select is((select count(*)::int from public.invites), 0, 'grandparent sees no invites');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c1"}', true);
select throws_ok(
  $$select * from public.create_invite('a1000000-0000-0000-0000-000000000000', 'parent')$$,
  '42501', null, 'parent of another family cannot invite into family A');
select is((select count(*)::int from public.invites), 0, 'parent of family B sees no invites of family A');

-- Redeeming (as the Edge Function does) ----------------------------------------
reset role;
update public.invites set expires_at = now() - interval '1 minute'
 where token_hash = public.invite_code_hash((select code from codes where name = 'expired'));

set local role service_role;

select is(
  public.redeem_invite(lower((select substr(code, 1, 4) || '-' || substr(code, 5) from codes where name = 'valid')),
                       '00000000-0000-0000-0000-0000000000d1'),
  'a1000000-0000-0000-0000-000000000000'::uuid,
  'valid code (typed lowercase with dash) joins the family');

select is(
  (select role::text from public.family_members
    where family_id = 'a1000000-0000-0000-0000-000000000000'
      and user_id = '00000000-0000-0000-0000-0000000000d1'),
  'grandparent', 'new member gets the role of the invite');

select throws_ok(
  $$select public.redeem_invite((select code from codes where name = 'valid'), '00000000-0000-0000-0000-0000000000e1')$$,
  'P0001', 'invalid_invite', 'used code is rejected');

select throws_ok(
  $$select public.redeem_invite((select code from codes where name = 'expired'), '00000000-0000-0000-0000-0000000000e1')$$,
  'P0001', 'invalid_invite', 'expired code is rejected');

select throws_ok(
  $$select public.redeem_invite('ZZZZZZZZ', '00000000-0000-0000-0000-0000000000e1')$$,
  'P0001', 'invalid_invite', 'unknown code is rejected');

select is(
  (select count(*)::int from public.family_members where user_id = '00000000-0000-0000-0000-0000000000e1'),
  0, 'rejected codes create no membership');

select * from finish();
rollback;
