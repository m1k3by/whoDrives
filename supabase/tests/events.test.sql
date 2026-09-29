begin;
select plan(17);

-- Fixtures: family A (parent a, grandparent g), family B (parent b)
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a3', 'parent-a@test.local'),
  ('00000000-0000-0000-0000-0000000000f3', 'grandparent-a@test.local'),
  ('00000000-0000-0000-0000-0000000000b3', 'parent-b@test.local');

insert into public.families (id, name, created_by) values
  ('a3000000-0000-0000-0000-000000000000', 'Familie A', '00000000-0000-0000-0000-0000000000a3'),
  ('b3000000-0000-0000-0000-000000000000', 'Familie B', '00000000-0000-0000-0000-0000000000b3');

insert into public.family_members (family_id, user_id, role) values
  ('a3000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-0000000000f3', 'grandparent');

insert into public.children (id, family_id, first_name, color) values
  ('c3000000-0000-0000-0000-00000000000b', 'b3000000-0000-0000-0000-000000000000', 'Kind B', '#123456');

-- Parent of family A ------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a3"}', true);

select lives_ok(
  $$insert into public.children (id, family_id, first_name, color)
    values ('c3000000-0000-0000-0000-00000000000a', 'a3000000-0000-0000-0000-000000000000', 'Lena', '#1E6FD9')$$,
  'parent can add a child');

select lives_ok(
  $$insert into public.events (id, family_id, child_id, title, kind, start_time, rrule, first_date)
    values ('e3000000-0000-0000-0000-00000000000a', 'a3000000-0000-0000-0000-000000000000',
            'c3000000-0000-0000-0000-00000000000a', 'Reiten', 'ride', '15:00',
            'FREQ=WEEKLY;BYDAY=TU', '2026-10-06')$$,
  'parent can create "Reiten, jeden Di 15 Uhr"');

select lives_ok(
  $$insert into public.events (family_id, child_id, title, start_time, first_date)
    values ('a3000000-0000-0000-0000-000000000000', 'c3000000-0000-0000-0000-00000000000a',
            'Zahnarzt', '09:30', '2026-10-08')$$,
  'parent can create a one-off event');

select throws_ok(
  $$insert into public.events (family_id, child_id, title, start_time, rrule, first_date)
    values ('a3000000-0000-0000-0000-000000000000', 'c3000000-0000-0000-0000-00000000000a',
            'X', '10:00', 'FREQ=DAILY', '2026-10-06')$$,
  '23514', null, 'unsupported recurrence rule is rejected');

select throws_ok(
  $$insert into public.events (family_id, child_id, title, start_time, first_date, until_date)
    values ('a3000000-0000-0000-0000-000000000000', 'c3000000-0000-0000-0000-00000000000a',
            'X', '10:00', '2026-10-06', '2026-10-01')$$,
  '23514', null, 'end date before start date is rejected');

select throws_ok(
  $$insert into public.events (family_id, child_id, title, start_time, first_date)
    values ('a3000000-0000-0000-0000-000000000000', 'c3000000-0000-0000-0000-00000000000b',
            'Fremdes Kind', '10:00', '2026-10-06')$$,
  '23503', null, 'event cannot point to a child of another family');

update public.events set start_time = '15:30' where id = 'e3000000-0000-0000-0000-00000000000a';
select is(
  (select start_time from public.events where id = 'e3000000-0000-0000-0000-00000000000a'),
  '15:30'::time, 'parent can change an event');

select is((select count(*)::int from public.children), 1, 'parent does not see children of family B');

-- Grandparent of family A ----------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000f3"}', true);

select is((select count(*)::int from public.events), 2, 'grandparent sees the family events');
select is((select count(*)::int from public.children), 1, 'grandparent sees the family children');

-- Equal rights (2026-09-29): grandparents may do everything parents may do.
select lives_ok(
  $$insert into public.events (id, family_id, child_id, title, start_time, first_date)
    values ('e3000000-0000-0000-0000-00000000000b', 'a3000000-0000-0000-0000-000000000000',
            'c3000000-0000-0000-0000-00000000000a', 'Oma-Termin', '10:00', '2026-10-06')$$,
  'grandparent can create events');

select lives_ok(
  $$insert into public.children (family_id, first_name, color)
    values ('a3000000-0000-0000-0000-000000000000', 'Max', '#000000')$$,
  'grandparent can add children');

update public.events set title = 'Geändert' where id = 'e3000000-0000-0000-0000-00000000000a';
delete from public.events where id = 'e3000000-0000-0000-0000-00000000000b';
select results_eq(
  $$select title from public.events where id in ('e3000000-0000-0000-0000-00000000000a',
                                                'e3000000-0000-0000-0000-00000000000b')$$,
  $$values ('Geändert')$$,
  'grandparent can change and delete events');

update public.children set first_name = 'Lena M.' where id = 'c3000000-0000-0000-0000-00000000000a';
select is(
  (select first_name from public.children where id = 'c3000000-0000-0000-0000-00000000000a'),
  'Lena M.', 'grandparent can change children');

-- Parent of family B ------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b3"}', true);

select is((select count(*)::int from public.events), 0, 'family B sees no events of family A');

select throws_ok(
  $$insert into public.events (family_id, child_id, title, start_time, first_date)
    values ('a3000000-0000-0000-0000-000000000000', 'c3000000-0000-0000-0000-00000000000a',
            'Eingeschleust', '10:00', '2026-10-06')$$,
  '42501', null, 'parent of family B cannot create events in family A');

delete from public.events;
reset role;
select is(
  (select count(*)::int from public.events where family_id = 'a3000000-0000-0000-0000-000000000000'),
  2, 'parent of family B cannot delete events of family A');

select * from finish();
rollback;
