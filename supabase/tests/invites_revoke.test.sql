begin;
select plan(4);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a4', 'parent-a@test.local'),
  ('00000000-0000-0000-0000-0000000000f4', 'grandparent-a@test.local'),
  ('00000000-0000-0000-0000-0000000000b4', 'parent-b@test.local'),
  ('00000000-0000-0000-0000-0000000000d4', 'newcomer@test.local');

insert into public.families (id, name, created_by) values
  ('a4000000-0000-0000-0000-000000000000', 'Familie A', '00000000-0000-0000-0000-0000000000a4'),
  ('b4000000-0000-0000-0000-000000000000', 'Familie B', '00000000-0000-0000-0000-0000000000b4');

insert into public.family_members (family_id, user_id, role) values
  ('a4000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-0000000000f4', 'grandparent');

create temp table codes (code text);
grant all on codes to authenticated, service_role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a4"}', true);
insert into codes select code from public.create_invite('a4000000-0000-0000-0000-000000000000', 'other');

-- grandparent and parent of another family cannot revoke
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000f4"}', true);
delete from public.invites;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b4"}', true);
delete from public.invites;
reset role;
select is((select count(*)::int from public.invites where family_id = 'a4000000-0000-0000-0000-000000000000'),
  1, 'only parents of the family can revoke');

-- parent revokes
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a4"}', true);
select lives_ok($$delete from public.invites$$, 'parent can revoke');
reset role;
select is((select count(*)::int from public.invites where family_id = 'a4000000-0000-0000-0000-000000000000'),
  0, 'revoked invite is gone');

set local role service_role;
select throws_ok(
  $$select public.redeem_invite((select code from codes), '00000000-0000-0000-0000-0000000000d4')$$,
  'P0001', 'invalid_invite', 'revoked code can no longer be redeemed');

select * from finish();
rollback;
