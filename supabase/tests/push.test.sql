begin;
select plan(16);

-- Family A: parent p (Mama), grandparent g (Oma), other o. Family B: parent x.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a7', 'parent-a@test.local'),
  ('00000000-0000-0000-0000-0000000000f7', 'grandparent-a@test.local'),
  ('00000000-0000-0000-0000-0000000000e7', 'other-a@test.local'),
  ('00000000-0000-0000-0000-0000000000b7', 'parent-b@test.local');
update public.profiles set display_name = 'Oma' where id = '00000000-0000-0000-0000-0000000000f7';
update public.profiles set display_name = 'Mama' where id = '00000000-0000-0000-0000-0000000000a7';

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

-- New event -> everybody except the creator, with time range, place and creator -------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a7"}', true);
insert into public.events (id, family_id, child_id, title, location, start_time, rrule, first_date)
values ('e7000000-0000-0000-0000-000000000000', 'a7000000-0000-0000-0000-000000000000',
        'c7000000-0000-0000-0000-000000000000', 'Reiten', 'Reitstall Sonnenhof', '15:00',
        'FREQ=WEEKLY;BYDAY=TU', '2030-06-04');
reset role;
select results_eq(
  $$select user_id, title, body from outbox_a order by user_id$$,
  $$values ('00000000-0000-0000-0000-0000000000e7'::uuid, 'Neuer Termin – wer kann?', 'Reiten (Lena), jeden Dienstag, 15:00–16:00 Uhr, Reitstall Sonnenhof · angelegt von Mama'),
           ('00000000-0000-0000-0000-0000000000f7'::uuid, 'Neuer Termin – wer kann?', 'Reiten (Lena), jeden Dienstag, 15:00–16:00 Uhr, Reitstall Sonnenhof · angelegt von Mama')$$,
  'new event: all members except the creator, with time range, place and creator');
delete from public.notification_outbox;

-- one concrete occurrence far in the future (scheduled messages: reminders.test.sql)
select public.generate_occurrences_for('e7000000-0000-0000-0000-000000000000', '2030-06-01', '2030-06-08');
create temp table occ as
  select id from public.occurrences where event_id = 'e7000000-0000-0000-0000-000000000000';
grant select on occ to authenticated;

-- Claim -> all members except the claimer ---------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000f7"}', true);
select public.claim_occurrence((select id from occ));
reset role;
select results_eq(
  $$select user_id, title, body from outbox_a order by user_id$$,
  $$values ('00000000-0000-0000-0000-0000000000a7'::uuid, 'Termin übernommen', 'Oma übernimmt: Reiten (Lena), Di 04.06., 15:00–16:00 Uhr, Reitstall Sonnenhof'),
           ('00000000-0000-0000-0000-0000000000e7'::uuid, 'Termin übernommen', 'Oma übernimmt: Reiten (Lena), Di 04.06., 15:00–16:00 Uhr, Reitstall Sonnenhof')$$,
  'claim: all other members are notified, not the one who claimed');
delete from public.notification_outbox;


-- Release -> all others ---------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000f7"}', true);
select public.release_occurrence((select id from occ));
reset role;
select results_eq(
  $$select user_id, title, body from outbox_a order by user_id$$,
  $$values ('00000000-0000-0000-0000-0000000000a7'::uuid, 'Wieder offen – wer übernimmt?', 'Oma kann doch nicht: Reiten (Lena), Di 04.06., 15:00–16:00 Uhr, Reitstall Sonnenhof'),
           ('00000000-0000-0000-0000-0000000000e7'::uuid, 'Wieder offen – wer übernimmt?', 'Oma kann doch nicht: Reiten (Lena), Di 04.06., 15:00–16:00 Uhr, Reitstall Sonnenhof')$$,
  'release by the assigned person: all others hear it is open again');
delete from public.notification_outbox;

-- Parent claims: the others hear about it, the parent not -----------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a7"}', true);
select public.claim_occurrence((select id from occ));
reset role;
select results_eq(
  $$select user_id from outbox_a order by user_id$$,
  $$values ('00000000-0000-0000-0000-0000000000e7'::uuid), ('00000000-0000-0000-0000-0000000000f7'::uuid)$$,
  'a parent claiming notifies the others, not themselves');
delete from public.notification_outbox;

-- Someone else releases Mama's claim ------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000f7"}', true);
select public.release_occurrence((select id from occ));
reset role;
select is(
  (select body from outbox_a where user_id = '00000000-0000-0000-0000-0000000000a7'),
  'Oma hat die Zusage von Mama aufgehoben: Reiten (Lena), Di 04.06., 15:00–16:00 Uhr, Reitstall Sonnenhof',
  'release of someone else''s claim says who did it');
delete from public.notification_outbox;

-- Cancel -> all others --------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a7"}', true);
select public.cancel_occurrence((select id from occ));
reset role;
select results_eq(
  $$select user_id, title, body from outbox_a order by user_id$$,
  $$values ('00000000-0000-0000-0000-0000000000e7'::uuid, 'Termin abgesagt', 'Mama hat abgesagt: Reiten (Lena), Di 04.06., 15:00–16:00 Uhr, Reitstall Sonnenhof'),
           ('00000000-0000-0000-0000-0000000000f7'::uuid, 'Termin abgesagt', 'Mama hat abgesagt: Reiten (Lena), Di 04.06., 15:00–16:00 Uhr, Reitstall Sonnenhof')$$,
  'cancel: all others are notified');

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
