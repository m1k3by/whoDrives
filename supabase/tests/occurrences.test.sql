begin;
select plan(18);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a5', 'parent-a@test.local'),
  ('00000000-0000-0000-0000-0000000000f5', 'grandparent-a@test.local'),
  ('00000000-0000-0000-0000-0000000000b5', 'parent-b@test.local');

insert into public.families (id, name, created_by) values
  ('a5000000-0000-0000-0000-000000000000', 'Familie A', '00000000-0000-0000-0000-0000000000a5'),
  ('b5000000-0000-0000-0000-000000000000', 'Familie B', '00000000-0000-0000-0000-0000000000b5');

insert into public.family_members (family_id, user_id, role) values
  ('a5000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-0000000000f5', 'grandparent');

insert into public.children (id, family_id, first_name, color) values
  ('c5000000-0000-0000-0000-000000000000', 'a5000000-0000-0000-0000-000000000000', 'Lena', '#1E6FD9');

-- Generation for the current window (trigger on insert) -------------------------------
insert into public.events (id, family_id, child_id, title, start_time, rrule, first_date)
values ('e5000000-0000-0000-0000-000000000001', 'a5000000-0000-0000-0000-000000000000',
        'c5000000-0000-0000-0000-000000000000', 'Reiten', '15:00',
        'FREQ=WEEKLY;BYDAY=' || (array['MO','TU','WE','TH','FR','SA','SU'])[extract(isodow from (now() at time zone 'Europe/Berlin'))::int],
        (now() at time zone 'Europe/Berlin')::date);

select is(
  (select count(*)::int from public.occurrences where event_id = 'e5000000-0000-0000-0000-000000000001'),
  53, 'new weekly event: the next 12 months (today + 52 weeks) are generated immediately');

select public.generate_occurrences();
select public.generate_occurrences();
select is(
  (select count(*)::int from public.occurrences where event_id = 'e5000000-0000-0000-0000-000000000001'),
  53, 'running the daily job again creates no duplicates');

select is(
  (select count(*)::int from cron.job where jobname = 'generate-occurrences'),
  1, 'daily cron job is scheduled');

-- DST with fixed dates (window generated explicitly) ------------------------------------
-- Autumn: DST ends Sun 2026-10-25. Weekly Sunday 15:00.
insert into public.events (id, family_id, child_id, title, start_time, duration_min, rrule, first_date)
values ('e5000000-0000-0000-0000-000000000002', 'a5000000-0000-0000-0000-000000000000',
        'c5000000-0000-0000-0000-000000000000', 'Schwimmen', '15:00', 90,
        'FREQ=WEEKLY;BYDAY=SU', '2026-10-18');
select public.generate_occurrences_for('e5000000-0000-0000-0000-000000000002', '2026-10-18', '2026-11-02');

select results_eq(
  $$select to_char(starts_at at time zone 'Europe/Berlin', 'YYYY-MM-DD HH24:MI'),
           to_char(starts_at at time zone 'UTC', 'HH24:MI'),
           to_char(ends_at at time zone 'Europe/Berlin', 'HH24:MI')
      from public.occurrences
     where event_id = 'e5000000-0000-0000-0000-000000000002'
       and starts_at < '2026-11-02'
     order by starts_at$$,
  $$values ('2026-10-18 15:00', '13:00', '16:30'),
           ('2026-10-25 15:00', '14:00', '16:30'),
           ('2026-11-01 15:00', '14:00', '16:30')$$,
  'autumn DST: 15:00 in Berlin stays 15:00');

-- Spring: DST starts Sun 2027-03-28. Weekly Tuesday + Sunday 15:00.
insert into public.events (id, family_id, child_id, title, start_time, rrule, first_date, until_date)
values ('e5000000-0000-0000-0000-000000000003', 'a5000000-0000-0000-0000-000000000000',
        'c5000000-0000-0000-0000-000000000000', 'Fußball', '15:00',
        'FREQ=WEEKLY;BYDAY=TU,SU', '2027-03-21', '2027-03-30');
select public.generate_occurrences_for('e5000000-0000-0000-0000-000000000003', '2027-03-01', '2027-05-01');

select results_eq(
  $$select to_char(starts_at at time zone 'Europe/Berlin', 'YYYY-MM-DD HH24:MI'),
           to_char(starts_at at time zone 'UTC', 'HH24:MI')
      from public.occurrences
     where event_id = 'e5000000-0000-0000-0000-000000000003'
     order by starts_at$$,
  $$values ('2027-03-21 15:00', '14:00'),
           ('2027-03-23 15:00', '14:00'),
           ('2027-03-28 15:00', '13:00'),
           ('2027-03-30 15:00', '13:00')$$,
  'spring DST, several weekdays, end date respected');

-- One-off event
insert into public.events (id, family_id, child_id, title, start_time, first_date)
values ('e5000000-0000-0000-0000-000000000004', 'a5000000-0000-0000-0000-000000000000',
        'c5000000-0000-0000-0000-000000000000', 'Zahnarzt', '09:30', '2027-01-12');
select public.generate_occurrences_for('e5000000-0000-0000-0000-000000000004', '2027-01-01', '2027-03-01');
select results_eq(
  $$select to_char(starts_at at time zone 'Europe/Berlin', 'YYYY-MM-DD HH24:MI')
      from public.occurrences where event_id = 'e5000000-0000-0000-0000-000000000004'$$,
  $$values ('2027-01-12 09:30')$$,
  'one-off event: exactly one occurrence');

-- Access -----------------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000f5"}', true);

select ok((select count(*) from public.occurrences) > 0, 'grandparent sees the family occurrences');

-- Equal rights (2026-09-29): every member may cancel.
select lives_ok(
  $$select public.cancel_occurrence((select id from public.occurrences
      where event_id = 'e5000000-0000-0000-0000-000000000004'))$$,
  'grandparent can cancel');

update public.occurrences set status = 'cancelled';
select is((select count(*)::int from public.occurrences
            where status = 'cancelled' and event_id <> 'e5000000-0000-0000-0000-000000000004'), 0,
  'grandparent cannot update occurrences directly');

select throws_ok(
  $$insert into public.occurrences (event_id, family_id, starts_at, ends_at)
    values ('e5000000-0000-0000-0000-000000000001', 'a5000000-0000-0000-0000-000000000000', now(), now())$$,
  '42501', null, 'occurrences cannot be inserted directly');

select throws_ok($$select public.generate_occurrences()$$, '42501', null,
  'app users cannot run the generator');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b5"}', true);
select is((select count(*)::int from public.occurrences), 0, 'family B sees no occurrences of family A');
select throws_ok(
  $$select public.cancel_occurrence('00000000-0000-0000-0000-000000000000')$$,
  '42501', null, 'unknown occurrence cannot be cancelled');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a5"}', true);
update public.occurrences set status = 'cancelled';
select is((select count(*)::int from public.occurrences
            where status = 'cancelled' and event_id <> 'e5000000-0000-0000-0000-000000000004'), 0,
  'parent cannot update occurrences directly either');

select lives_ok(
  $$select public.cancel_occurrence((select id from public.occurrences
      where event_id = 'e5000000-0000-0000-0000-000000000001' order by starts_at desc limit 1))$$,
  'parent can cancel an occurrence');
select is((select count(*)::int from public.occurrences
            where status = 'cancelled' and event_id = 'e5000000-0000-0000-0000-000000000001'), 1,
  'exactly that occurrence is cancelled');

-- Changing the rule rebuilds open future occurrences, keeps cancelled ones --------------
update public.events set start_time = '16:00' where id = 'e5000000-0000-0000-0000-000000000001';
reset role;
select is(
  (select count(*)::int from public.occurrences
    where event_id = 'e5000000-0000-0000-0000-000000000001' and status = 'open'
      and starts_at > now()
      and to_char(starts_at at time zone 'Europe/Berlin', 'HH24:MI') <> '16:00'),
  0, 'after a time change, open future occurrences use the new time');
select is(
  (select count(*)::int from public.occurrences
    where event_id = 'e5000000-0000-0000-0000-000000000001' and status = 'cancelled'),
  1, 'cancelled occurrence is kept after a rule change');

select * from finish();
rollback;
