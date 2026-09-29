begin;
select plan(13);

-- Family A: parent p, grandparent g. Family B: only parent x.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a8', 'parent-a@test.local'),
  ('00000000-0000-0000-0000-0000000000f8', 'grandparent-a@test.local'),
  ('00000000-0000-0000-0000-0000000000b8', 'parent-b@test.local');

insert into public.families (id, name, created_by) values
  ('a8000000-0000-0000-0000-000000000000', 'Familie A', '00000000-0000-0000-0000-0000000000a8'),
  ('b8000000-0000-0000-0000-000000000000', 'Familie B', '00000000-0000-0000-0000-0000000000b8');
insert into public.family_members (family_id, user_id, role) values
  ('a8000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-0000000000f8', 'grandparent');

insert into public.children (id, family_id, first_name, color) values
  ('c8000000-0000-0000-0000-00000000000a', 'a8000000-0000-0000-0000-000000000000', 'Lena', '#1E6FD9'),
  ('c8000000-0000-0000-0000-00000000000b', 'b8000000-0000-0000-0000-000000000000', 'Max', '#2E9E44');
insert into public.events (id, family_id, child_id, title, start_time, first_date, created_by) values
  ('e8000000-0000-0000-0000-00000000000a', 'a8000000-0000-0000-0000-000000000000',
   'c8000000-0000-0000-0000-00000000000a', 'Reiten', '15:00', '2030-06-04', '00000000-0000-0000-0000-0000000000a8'),
  ('e8000000-0000-0000-0000-00000000000b', 'b8000000-0000-0000-0000-000000000000',
   'c8000000-0000-0000-0000-00000000000b', 'Fußball', '10:00', '2030-06-05', '00000000-0000-0000-0000-0000000000b8');
select public.generate_occurrences_for('e8000000-0000-0000-0000-00000000000a', '2030-06-01', '2030-07-01');
select public.generate_occurrences_for('e8000000-0000-0000-0000-00000000000b', '2030-06-01', '2030-07-01');

-- Grandparent claims the occurrence and has a device and a pending message
update public.occurrences set status = 'claimed', assigned_to = '00000000-0000-0000-0000-0000000000f8'
 where event_id = 'e8000000-0000-0000-0000-00000000000a';
insert into public.push_tokens (token, user_id, platform)
values ('ExponentPushToken[grandparent]', '00000000-0000-0000-0000-0000000000f8', 'android');
insert into public.notification_outbox (user_id, title, body)
values ('00000000-0000-0000-0000-0000000000f8', 'Test', 'Test');

-- Grandparent deletes the account (what the Edge Function does) ------------------------
delete from auth.users where id = '00000000-0000-0000-0000-0000000000f8';

select is((select count(*)::int from public.profiles where id = '00000000-0000-0000-0000-0000000000f8'),
  0, 'profile is deleted');
select is((select count(*)::int from public.family_members where user_id = '00000000-0000-0000-0000-0000000000f8'),
  0, 'memberships are deleted');
select is((select count(*)::int from public.push_tokens where user_id = '00000000-0000-0000-0000-0000000000f8'),
  0, 'push tokens are deleted');
select is((select count(*)::int from public.notification_outbox where user_id = '00000000-0000-0000-0000-0000000000f8'),
  0, 'pending messages are deleted');
select results_eq(
  $$select status::text, assigned_to from public.occurrences
     where event_id = 'e8000000-0000-0000-0000-00000000000a'$$,
  $$values ('claimed', null::uuid)$$,
  'claimed occurrence stays (shown as "ehemaliges Mitglied")');
select is((select count(*)::int from public.families where id = 'a8000000-0000-0000-0000-000000000000'),
  1, 'family with remaining members stays');
select is((select count(*)::int from public.events where family_id = 'a8000000-0000-0000-0000-000000000000'),
  1, 'events of a family with remaining members stay');

-- The creator (last member of family B) deletes the account ----------------------------
delete from auth.users where id = '00000000-0000-0000-0000-0000000000b8';

select is((select count(*)::int from public.families where id = 'b8000000-0000-0000-0000-000000000000'),
  0, 'family without members is deleted');
select is((select count(*)::int from public.children where family_id = 'b8000000-0000-0000-0000-000000000000'),
  0, 'its children are deleted');
select is((select count(*)::int from public.events where family_id = 'b8000000-0000-0000-0000-000000000000'),
  0, 'its events are deleted');
select is((select count(*)::int from public.occurrences where family_id = 'b8000000-0000-0000-0000-000000000000'),
  0, 'its occurrences are deleted');

-- Leaving works the same way ---------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a8"}', true);
delete from public.family_members where user_id = auth.uid();
reset role;
select is((select count(*)::int from public.families where id = 'a8000000-0000-0000-0000-000000000000'),
  0, 'last member leaving deletes the family');
select is((select count(*)::int from public.children where family_id = 'a8000000-0000-0000-0000-000000000000'),
  0, 'and its children');

select * from finish();
rollback;
