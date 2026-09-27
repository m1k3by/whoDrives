begin;
select plan(19);

-- Fixtures (as postgres, RLS bypassed) ---------------------------------------
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'parent-a@test.local'),
  ('00000000-0000-0000-0000-00000000000b', 'grandparent-a@test.local'),
  ('00000000-0000-0000-0000-00000000000c', 'parent-b@test.local'),
  ('00000000-0000-0000-0000-00000000000d', 'loner@test.local');

insert into public.families (id, name, created_by) values
  ('a0000000-0000-0000-0000-000000000000', 'Familie A', '00000000-0000-0000-0000-00000000000a'),
  ('b0000000-0000-0000-0000-000000000000', 'Familie B', '00000000-0000-0000-0000-00000000000c');

insert into public.family_members (family_id, user_id, role) values
  ('a0000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-00000000000b', 'grandparent');

-- Triggers -------------------------------------------------------------------
select is(
  (select count(*)::int from public.profiles where id in (
    '00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000d')),
  2, 'signup creates a profile');

select is(
  (select role::text from public.family_members
    where family_id = 'a0000000-0000-0000-0000-000000000000'
      and user_id = '00000000-0000-0000-0000-00000000000a'),
  'parent', 'family creator becomes parent');

-- Acting as parent of family A -----------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a"}', true);

select results_eq(
  'select id from public.families',
  $$values ('a0000000-0000-0000-0000-000000000000'::uuid)$$,
  'family A member sees only family A');

select is(
  (select count(*)::int from public.family_members
    where family_id = 'b0000000-0000-0000-0000-000000000000'),
  0, 'family A member sees no members of family B');

select is(
  (select count(*)::int from public.profiles where id = '00000000-0000-0000-0000-00000000000c'),
  0, 'family A member sees no profile from family B');

select is(
  (select count(*)::int from public.profiles where id = '00000000-0000-0000-0000-00000000000b'),
  1, 'family A member sees profile of own family');

select throws_ok(
  $$insert into public.family_members (family_id, user_id, role)
    values ('b0000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-00000000000a', 'parent')$$,
  '42501', null, 'cannot join a family directly');

select throws_ok(
  $$insert into public.families (name, created_by)
    values ('Fremd', '00000000-0000-0000-0000-00000000000c')$$,
  '42501', null, 'cannot create a family in someone else''s name');

update public.profiles set display_name = 'Hacked' where id = '00000000-0000-0000-0000-00000000000b';
select is(
  (select display_name from public.profiles where id = '00000000-0000-0000-0000-00000000000b'),
  '', 'cannot update another profile');

update public.profiles set display_name = 'Mama' where id = '00000000-0000-0000-0000-00000000000a';
select is(
  (select display_name from public.profiles where id = '00000000-0000-0000-0000-00000000000a'),
  'Mama', 'can update own profile');

-- Acting as grandparent of family A ------------------------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b"}', true);

delete from public.family_members
 where family_id = 'a0000000-0000-0000-0000-000000000000'
   and user_id = '00000000-0000-0000-0000-00000000000a';
select is(
  (select count(*)::int from public.family_members
    where user_id = '00000000-0000-0000-0000-00000000000a'),
  1, 'grandparent cannot remove another member');

-- Acting as parent of family B -----------------------------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000c"}', true);

delete from public.family_members where family_id = 'a0000000-0000-0000-0000-000000000000';
reset role;
select is(
  (select count(*)::int from public.family_members
    where family_id = 'a0000000-0000-0000-0000-000000000000'),
  2, 'parent of family B cannot remove members of family A');
set local role authenticated;

-- Acting as a user without family --------------------------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000d"}', true);

select is((select count(*)::int from public.families), 0, 'user without family sees no families');
select is((select count(*)::int from public.family_members), 0, 'user without family sees no members');

select lives_ok(
  $$insert into public.families (name) values ('Neue Familie')$$,
  'logged-in user can create a family');

select results_eq(
  'select name, role::text from public.families f join public.family_members m on m.family_id = f.id',
  $$values ('Neue Familie', 'parent')$$,
  'creator sees new family as parent');

-- Parent removes, member leaves ----------------------------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a"}', true);
delete from public.family_members
 where family_id = 'a0000000-0000-0000-0000-000000000000'
   and user_id = '00000000-0000-0000-0000-00000000000b';
select is(
  (select count(*)::int from public.family_members
    where family_id = 'a0000000-0000-0000-0000-000000000000'),
  1, 'parent can remove a member');

delete from public.family_members
 where family_id = 'a0000000-0000-0000-0000-000000000000'
   and user_id = '00000000-0000-0000-0000-00000000000a';
select is((select count(*)::int from public.families), 0, 'member can leave the family');

-- app_config -----------------------------------------------------------------
set local role anon;
select is(
  (select value from public.app_config where key = 'min_app_version'),
  '1.0.0', 'anon can read min_app_version');

select * from finish();
rollback;
