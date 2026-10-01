begin;
select plan(10);

-- Family A: Mama + Oma, children Lena and Tom. Family B: Fremd with child Max.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a9', 'parent-a@test.local'),
  ('00000000-0000-0000-0000-0000000000f9', 'grandparent-a@test.local'),
  ('00000000-0000-0000-0000-0000000000b9', 'parent-b@test.local');
update public.profiles set display_name = 'Mama' where id = '00000000-0000-0000-0000-0000000000a9';

insert into public.families (id, name, created_by) values
  ('a9000000-0000-0000-0000-000000000000', 'Familie A', '00000000-0000-0000-0000-0000000000a9'),
  ('b9000000-0000-0000-0000-000000000000', 'Familie B', '00000000-0000-0000-0000-0000000000b9');
insert into public.family_members (family_id, user_id, role) values
  ('a9000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-0000000000f9', 'grandparent');
insert into public.children (id, family_id, first_name, color) values
  ('c9000000-0000-0000-0000-00000000000a', 'a9000000-0000-0000-0000-000000000000', 'Lena', '#1E6FD9'),
  ('c9000000-0000-0000-0000-00000000000b', 'a9000000-0000-0000-0000-000000000000', 'Tom', '#2E9E44'),
  ('c9000000-0000-0000-0000-00000000000c', 'b9000000-0000-0000-0000-000000000000', 'Max', '#E07B00');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a9"}', true);

-- app versions that only know child_id keep working ----------------------------------------
insert into public.events (id, family_id, child_id, title, start_time, first_date)
values ('e9000000-0000-0000-0000-00000000000a', 'a9000000-0000-0000-0000-000000000000',
        'c9000000-0000-0000-0000-00000000000a', 'Reiten', '15:00', '2030-06-04');
select is((select child_ids from public.events where id = 'e9000000-0000-0000-0000-00000000000a'),
  array['c9000000-0000-0000-0000-00000000000a']::uuid[],
  'old app: child_id alone becomes the list of children');

-- several children, in the chosen order ---------------------------------------------------
insert into public.events (id, family_id, child_id, child_ids, title, location, start_time, rrule, first_date)
values ('e9000000-0000-0000-0000-00000000000b', 'a9000000-0000-0000-0000-000000000000',
        'c9000000-0000-0000-0000-00000000000a',
        array['c9000000-0000-0000-0000-00000000000b', 'c9000000-0000-0000-0000-00000000000a']::uuid[],
        'Schwimmen', 'Hallenbad', '16:00', 'FREQ=WEEKLY;BYDAY=TU', '2030-06-04');
select is((select child_id from public.events where id = 'e9000000-0000-0000-0000-00000000000b'),
  'c9000000-0000-0000-0000-00000000000b'::uuid, 'child_id always becomes the first of the list');
select results_eq(
  $$select c.first_name from public.events e, public.event_children(e) c
     where e.id = 'e9000000-0000-0000-0000-00000000000b'$$,
  $$values ('Tom'), ('Lena')$$,
  'event_children lists all children in the chosen order');

select throws_ok(
  $$insert into public.events (family_id, child_id, child_ids, title, start_time, first_date)
    values ('a9000000-0000-0000-0000-000000000000', 'c9000000-0000-0000-0000-00000000000a',
            array['c9000000-0000-0000-0000-00000000000a', 'c9000000-0000-0000-0000-00000000000c']::uuid[],
            'Fußball', '15:00', '2030-06-04')$$,
  '23503', null, 'a child of another family cannot be added');
select throws_ok(
  $$insert into public.events (family_id, child_id, child_ids, title, start_time, first_date)
    values ('a9000000-0000-0000-0000-000000000000', 'c9000000-0000-0000-0000-00000000000a',
            array['c9000000-0000-0000-0000-00000000000a', 'c9000000-0000-0000-0000-00000000000a']::uuid[],
            'Fußball', '15:00', '2030-06-04')$$,
  '23514', null, 'the same child cannot be listed twice');

-- old app changes only child_id -> the list follows
update public.events set child_id = 'c9000000-0000-0000-0000-00000000000b'
 where id = 'e9000000-0000-0000-0000-00000000000a';
select is((select child_ids from public.events where id = 'e9000000-0000-0000-0000-00000000000a'),
  array['c9000000-0000-0000-0000-00000000000b']::uuid[],
  'old app changing child_id changes the list too');

-- the other family sees neither the event nor its children --------------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b9"}', true);
select is((select count(*)::int from public.events e, public.event_children(e) c
            where e.id = 'e9000000-0000-0000-0000-00000000000b'), 0,
  'other families see nothing');
reset role;
select set_config('request.jwt.claims', '', true); -- server side: no logged-in user

select throws_ok(
  $$insert into public.events (family_id, child_id, child_ids, title, start_time, first_date)
    values ('a9000000-0000-0000-0000-000000000000', 'c9000000-0000-0000-0000-00000000000a',
            array['c9000000-0000-0000-0000-00000000000a', 'c9000000-0000-0000-0000-00000000000c']::uuid[],
            'Fußball', '15:00', '2030-06-04')$$,
  '23503', null, 'also without RLS (server side) a foreign child is rejected');

-- texts name all children ---------------------------------------------------------------------
select is((select body from public.notification_outbox
            where user_id = '00000000-0000-0000-0000-0000000000f9' and body like 'Schwimmen%'),
  'Schwimmen (Tom, Lena), jeden Dienstag, 16:00–17:00 Uhr, Hallenbad · angelegt von Mama',
  'new event message names all children');

select public.generate_occurrences_for('e9000000-0000-0000-0000-00000000000b', '2030-06-01', '2030-06-08');
select is(
  (select public.describe_occurrence(id) from public.occurrences
    where event_id = 'e9000000-0000-0000-0000-00000000000b'),
  'Schwimmen (Tom, Lena), Di 04.06., 16:00–17:00 Uhr, Hallenbad',
  'reminders and claim messages name all children');

select * from finish();
rollback;
