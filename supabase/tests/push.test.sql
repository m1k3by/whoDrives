begin;
select plan(20);

-- Family A: parent p, grandparent g, other o. Family B: parent x.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a7', 'parent-a@test.local'),
  ('00000000-0000-0000-0000-0000000000f7', 'grandparent-a@test.local'),
  ('00000000-0000-0000-0000-0000000000e7', 'other-a@test.local'),
  ('00000000-0000-0000-0000-0000000000b7', 'parent-b@test.local');
update public.profiles set display_name = 'Oma' where id = '00000000-0000-0000-0000-0000000000f7';

insert into public.families (id, name, created_by) values
  ('a7000000-0000-0000-0000-000000000000', 'Familie A', '00000000-0000-0000-0000-0000000000a7'),
  ('b7000000-0000-0000-0000-000000000000', 'Familie B', '00000000-0000-0000-0000-0000000000b7');
insert into public.family_members (family_id, user_id, role) values
  ('a7000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-0000000000f7', 'grandparent'),
  ('a7000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-0000000000e7', 'other');
insert into public.children (id, family_id, first_name, color) values
  ('c7000000-0000-0000-0000-000000000000', 'a7000000-0000-0000-0000-000000000000', 'Lena', '#1E6FD9');

create temp view outbox_a as
  select user_id, title, body from public.notification_outbox
   where user_id in ('00000000-0000-0000-0000-0000000000a7', '00000000-0000-0000-0000-0000000000f7',
                     '00000000-0000-0000-0000-0000000000e7', '00000000-0000-0000-0000-0000000000b7');

-- Push tokens -----------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000f7"}', true);
select lives_ok($$select public.register_push_token('ExponentPushToken[oma-phone]', 'android')$$,
  'user registers the push token of the device');
select is((select count(*)::int from public.push_tokens), 1, 'user sees the own token');
select throws_ok($$select public.register_push_token('not-a-token', 'android')$$,
  '23514', null, 'invalid token format is rejected');
select throws_ok(
  $$insert into public.push_tokens (token, user_id, platform)
    values ('ExponentPushToken[x]', '00000000-0000-0000-0000-0000000000a7', 'android')$$,
  '42501', null, 'tokens cannot be inserted directly (e.g. for someone else)');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e7"}', true);
select is((select count(*)::int from public.push_tokens), 0, 'other users do not see foreign tokens');
select public.register_push_token('ExponentPushToken[oma-phone]', 'android');
reset role;
select is((select user_id from public.push_tokens where token = 'ExponentPushToken[oma-phone]'),
  '00000000-0000-0000-0000-0000000000e7'::uuid, 'logging in with another account moves the device token');

set local role authenticated;
select is((select count(*)::int from public.notification_outbox), 0, 'app users cannot read the outbox');

-- New event -> everybody except the creator -------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a7"}', true);
insert into public.events (id, family_id, child_id, title, start_time, rrule, first_date)
values ('e7000000-0000-0000-0000-000000000000', 'a7000000-0000-0000-0000-000000000000',
        'c7000000-0000-0000-0000-000000000000', 'Reiten', '15:00', 'FREQ=WEEKLY;BYDAY=TU', '2030-06-04');
reset role;
select results_eq(
  $$select user_id, title, body from outbox_a order by user_id$$,
  $$values ('00000000-0000-0000-0000-0000000000e7'::uuid, 'Neuer Termin – wer kann?', 'Reiten (Lena), jeden Dienstag, 15:00 Uhr'),
           ('00000000-0000-0000-0000-0000000000f7'::uuid, 'Neuer Termin – wer kann?', 'Reiten (Lena), jeden Dienstag, 15:00 Uhr')$$,
  'new event: all members except the creator are notified');
delete from public.notification_outbox;

-- one concrete occurrence far in the future for the time-based checks
select public.generate_occurrences_for('e7000000-0000-0000-0000-000000000000', '2030-06-01', '2030-06-08');
create temp table occ as
  select id from public.occurrences where event_id = 'e7000000-0000-0000-0000-000000000000';
grant select on occ to authenticated;

-- Evening before (tomorrow = Tue 2030-06-04, local Berlin time) -----------------------------
select public.enqueue_scheduled_notifications('2030-06-03 17:59:00 Europe/Berlin');
select is((select count(*)::int from outbox_a), 0, 'no evening message before 18:00');

select public.enqueue_scheduled_notifications('2030-06-03 18:00:00 Europe/Berlin');
select results_eq(
  $$select user_id, title, body from outbox_a order by user_id$$,
  $$values ('00000000-0000-0000-0000-0000000000a7'::uuid, 'Morgen noch offen – wer übernimmt?', 'Reiten (Lena), Di 04.06., 15:00 Uhr'),
           ('00000000-0000-0000-0000-0000000000e7'::uuid, 'Morgen noch offen – wer übernimmt?', 'Reiten (Lena), Di 04.06., 15:00 Uhr'),
           ('00000000-0000-0000-0000-0000000000f7'::uuid, 'Morgen noch offen – wer übernimmt?', 'Reiten (Lena), Di 04.06., 15:00 Uhr')$$,
  'from 18:00 the evening before: all members get the open occurrence');

select public.enqueue_scheduled_notifications('2030-06-03 18:05:00 Europe/Berlin');
select public.enqueue_scheduled_notifications('2030-06-03 21:00:00 Europe/Berlin');
select is((select count(*)::int from outbox_a), 3, 'later job runs do not repeat the evening message');
delete from public.notification_outbox;

-- Claim -> all members except the claimer ---------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000f7"}', true);
select public.claim_occurrence((select id from occ));
reset role;
select results_eq(
  $$select user_id, title, body from outbox_a order by user_id$$,
  $$values ('00000000-0000-0000-0000-0000000000a7'::uuid, 'Termin übernommen', 'Oma übernimmt: Reiten (Lena), Di 04.06., 15:00 Uhr'),
           ('00000000-0000-0000-0000-0000000000e7'::uuid, 'Termin übernommen', 'Oma übernimmt: Reiten (Lena), Di 04.06., 15:00 Uhr')$$,
  'claim: all other members are notified, not the one who claimed');
delete from public.notification_outbox;

select public.enqueue_scheduled_notifications('2030-06-04 18:00:00 Europe/Berlin');
select is((select count(*)::int from outbox_a where title like 'Morgen%'), 0,
  'claimed occurrences get no evening message');

-- Reminder one hour before -> assigned person ------------------------------------------------
select public.enqueue_scheduled_notifications('2030-06-04 13:55:00 Europe/Berlin');
select is((select count(*)::int from outbox_a), 0, 'no reminder earlier than one hour before');
select public.enqueue_scheduled_notifications('2030-06-04 14:00:00 Europe/Berlin');
select public.enqueue_scheduled_notifications('2030-06-04 14:05:00 Europe/Berlin');
select results_eq(
  $$select user_id, title, body from outbox_a$$,
  $$values ('00000000-0000-0000-0000-0000000000f7'::uuid, 'Gleich geht''s los', 'Reiten (Lena), Di 04.06., 15:00 Uhr')$$,
  'one hour before: exactly one reminder for the assigned person');
select public.enqueue_scheduled_notifications('2030-06-04 15:01:00 Europe/Berlin');
select is((select count(*)::int from outbox_a), 1, 'no reminder after the start');
delete from public.notification_outbox;

-- A parent claims: grandparent and other member hear about it, the parent not ------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000f7"}', true);
select public.release_occurrence((select id from occ));
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a7"}', true);
select public.claim_occurrence((select id from occ));
reset role;
select results_eq(
  $$select user_id from outbox_a order by user_id$$,
  $$values ('00000000-0000-0000-0000-0000000000e7'::uuid), ('00000000-0000-0000-0000-0000000000f7'::uuid)$$,
  'a parent claiming notifies grandparents and others, not themselves');

-- Isolation and jobs -------------------------------------------------------------------------
select is((select count(*)::int from outbox_a where user_id = '00000000-0000-0000-0000-0000000000b7'), 0,
  'other families never get messages');
select lives_ok($$select public.deliver_notifications()$$,
  'delivery without vault secrets does not fail');
select is(
  (select count(*)::int from cron.job where jobname in ('enqueue-notifications', 'deliver-notifications')),
  2, 'both notification jobs are scheduled');

select * from finish();
rollback;
