begin;
select plan(13);

-- Family A: Mama (creator), Oma, other. Family B: x (must never get anything).
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a8', 'parent-a@test.local'),
  ('00000000-0000-0000-0000-0000000000f8', 'grandparent-a@test.local'),
  ('00000000-0000-0000-0000-0000000000e8', 'other-a@test.local'),
  ('00000000-0000-0000-0000-0000000000b8', 'parent-b@test.local');
update public.profiles set display_name = 'Oma' where id = '00000000-0000-0000-0000-0000000000f8';

insert into public.families (id, name, created_by) values
  ('a8000000-0000-0000-0000-000000000000', 'Familie A', '00000000-0000-0000-0000-0000000000a8'),
  ('b8000000-0000-0000-0000-000000000000', 'Familie B', '00000000-0000-0000-0000-0000000000b8');
insert into public.family_members (family_id, user_id, role) values
  ('a8000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-0000000000f8', 'grandparent'),
  ('a8000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-0000000000e8', 'other');
insert into public.children (id, family_id, first_name, color) values
  ('c8000000-0000-0000-0000-000000000000', 'a8000000-0000-0000-0000-000000000000', 'Lena', '#1E6FD9');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a8"}', true);
insert into public.events (id, family_id, child_id, title, location, start_time, rrule, first_date)
values ('e8000000-0000-0000-0000-000000000000', 'a8000000-0000-0000-0000-000000000000',
        'c8000000-0000-0000-0000-000000000000', 'Reiten', 'Reitstall Sonnenhof', '15:00',
        'FREQ=WEEKLY;BYDAY=TU', '2030-06-04');
reset role;

-- Tue 04.06., 11.06. and 18.06.2030, 15:00 Berlin
select public.generate_occurrences_for('e8000000-0000-0000-0000-000000000000', '2030-06-01', '2030-06-19');
create temp table occ as
  select id, starts_at from public.occurrences where event_id = 'e8000000-0000-0000-0000-000000000000';
grant select on occ to authenticated;
delete from public.notification_outbox;

create temp view outbox_a as
  select user_id, title, body from public.notification_outbox
   where user_id in ('00000000-0000-0000-0000-0000000000a8', '00000000-0000-0000-0000-0000000000f8',
                     '00000000-0000-0000-0000-0000000000e8', '00000000-0000-0000-0000-0000000000b8');

-- 3 days before, still open -> all members (including the creator) ---------------------------
select public.enqueue_scheduled_notifications('2030-06-01 14:55:00 Europe/Berlin');
select is((select count(*)::int from outbox_a), 0, 'nothing earlier than 3 days before');

select public.enqueue_scheduled_notifications('2030-06-01 15:00:00 Europe/Berlin');
select results_eq(
  $$select user_id, title, body from outbox_a order by user_id$$,
  $$values ('00000000-0000-0000-0000-0000000000a8'::uuid, 'In 3 Tagen noch offen – wer kann?', 'Reiten (Lena), Di 04.06., 15:00–16:00 Uhr, Reitstall Sonnenhof'),
           ('00000000-0000-0000-0000-0000000000e8'::uuid, 'In 3 Tagen noch offen – wer kann?', 'Reiten (Lena), Di 04.06., 15:00–16:00 Uhr, Reitstall Sonnenhof'),
           ('00000000-0000-0000-0000-0000000000f8'::uuid, 'In 3 Tagen noch offen – wer kann?', 'Reiten (Lena), Di 04.06., 15:00–16:00 Uhr, Reitstall Sonnenhof')$$,
  '3 days before: all members hear it is still open, the other family nothing');

select public.enqueue_scheduled_notifications('2030-06-01 15:05:00 Europe/Berlin');
select public.enqueue_scheduled_notifications('2030-06-02 10:00:00 Europe/Berlin');
select is((select count(*)::int from outbox_a), 3, 'later job runs do not repeat it');

-- 1 day before, still open -> all members ---------------------------------------------------
select public.enqueue_scheduled_notifications('2030-06-03 15:00:00 Europe/Berlin');
select is((select count(*)::int from outbox_a where title = 'Morgen noch offen – wer kann?'), 3,
  '1 day before: all members hear it is still open');
delete from public.notification_outbox;

-- taken -> only the assigned person, 1 day and 1 hour before ---------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000f8"}', true);
select public.claim_occurrence((select id from occ order by starts_at limit 1));
reset role;
delete from public.notification_outbox;

select public.enqueue_scheduled_notifications('2030-06-03 15:05:00 Europe/Berlin');
select results_eq(
  $$select user_id, title, body from outbox_a$$,
  $$values ('00000000-0000-0000-0000-0000000000f8'::uuid, 'Morgen bist du dran', 'Reiten (Lena), Di 04.06., 15:00–16:00 Uhr, Reitstall Sonnenhof')$$,
  '1 day before, taken: only the assigned person is reminded');

-- outbox rows stay (sent_at only), they are what prevents repeats
select public.enqueue_scheduled_notifications('2030-06-04 13:55:00 Europe/Berlin');
select is((select count(*)::int from outbox_a), 1, 'no new message earlier than one hour before');
select public.enqueue_scheduled_notifications('2030-06-04 14:00:00 Europe/Berlin');
select public.enqueue_scheduled_notifications('2030-06-04 14:05:00 Europe/Berlin');
select results_eq(
  $$select user_id, title, body from outbox_a where title <> 'Morgen bist du dran'$$,
  $$values ('00000000-0000-0000-0000-0000000000f8'::uuid, 'Gleich geht''s los', 'Reiten (Lena), Di 04.06., 15:00–16:00 Uhr, Reitstall Sonnenhof')$$,
  '1 hour before, taken: exactly one reminder for the assigned person');

-- released again within the last hour -> all members ----------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000f8"}', true);
select public.release_occurrence((select id from occ order by starts_at limit 1));
reset role;
delete from public.notification_outbox;
select public.enqueue_scheduled_notifications('2030-06-04 14:10:00 Europe/Berlin');
select is((select count(*)::int from outbox_a where title = 'In 1 Stunde noch offen – wer kann?'), 3,
  '1 hour before, open again: all members');

select public.enqueue_scheduled_notifications('2030-06-04 15:01:00 Europe/Berlin');
select is((select count(*)::int from outbox_a), 3, 'nothing after the start');
delete from public.notification_outbox;

-- created only 2 days before -> no 3-day message, the 1-day one comes -----------------------
update public.occurrences set created_at = starts_at - interval '2 days'
 where id = (select id from occ order by starts_at offset 1 limit 1);
select public.enqueue_scheduled_notifications('2030-06-08 15:00:00 Europe/Berlin');
select is((select count(*)::int from outbox_a), 0,
  'created after the 3-day point: no 3-day message (the new-event message covered it)');
select public.enqueue_scheduled_notifications('2030-06-10 15:00:00 Europe/Berlin');
select is((select count(*)::int from outbox_a where title = 'Morgen noch offen – wer kann?'), 3,
  'the 1-day message still comes');
delete from public.notification_outbox;

-- job did not run for days -> only the latest due stage, no burst ----------------------------
select public.enqueue_scheduled_notifications('2030-06-18 14:30:00 Europe/Berlin');
select results_eq(
  $$select distinct title from outbox_a$$,
  $$values ('In 1 Stunde noch offen – wer kann?')$$,
  'after an outage only the latest stage is sent');

select is((select count(*)::int from public.notification_outbox
            where user_id = '00000000-0000-0000-0000-0000000000b8'), 0,
  'the other family gets nothing');

select * from finish();
rollback;
