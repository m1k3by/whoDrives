begin;
select plan(15);

-- Family A: parent p, grandparent g, other member o. Family B: parent x.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a6', 'parent-a@test.local'),
  ('00000000-0000-0000-0000-0000000000f6', 'grandparent-a@test.local'),
  ('00000000-0000-0000-0000-0000000000e6', 'other-a@test.local'),
  ('00000000-0000-0000-0000-0000000000b6', 'parent-b@test.local');

insert into public.families (id, name, created_by) values
  ('a6000000-0000-0000-0000-000000000000', 'Familie A', '00000000-0000-0000-0000-0000000000a6'),
  ('b6000000-0000-0000-0000-000000000000', 'Familie B', '00000000-0000-0000-0000-0000000000b6');

insert into public.family_members (family_id, user_id, role) values
  ('a6000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-0000000000f6', 'grandparent'),
  ('a6000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-0000000000e6', 'other');

insert into public.children (id, family_id, first_name, color) values
  ('c6000000-0000-0000-0000-000000000000', 'a6000000-0000-0000-0000-000000000000', 'Lena', '#1E6FD9');

-- one-off event far in the future: exactly one occurrence, independent of today
insert into public.events (id, family_id, child_id, title, start_time, first_date)
values ('e6000000-0000-0000-0000-000000000000', 'a6000000-0000-0000-0000-000000000000',
        'c6000000-0000-0000-0000-000000000000', 'Reiten', '15:00', '2030-06-04');
select public.generate_occurrences_for('e6000000-0000-0000-0000-000000000000', '2030-06-01', '2030-07-01');
insert into public.events (id, family_id, child_id, title, start_time, first_date)
values ('e6000000-0000-0000-0000-000000000001', 'a6000000-0000-0000-0000-000000000000',
        'c6000000-0000-0000-0000-000000000000', 'Zahnarzt', '09:00', '2030-06-05');
select public.generate_occurrences_for('e6000000-0000-0000-0000-000000000001', '2030-06-01', '2030-07-01');

create temp table ids as
select (select id from public.occurrences where event_id = 'e6000000-0000-0000-0000-000000000000') as reiten,
       (select id from public.occurrences where event_id = 'e6000000-0000-0000-0000-000000000001') as zahnarzt;
grant select on ids to authenticated;

-- Claim -----------------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000f6"}', true);

select is(public.claim_occurrence((select reiten from ids)), true, 'grandparent can claim an open occurrence');
select results_eq(
  $$select status::text, assigned_to from public.occurrences where id = (select reiten from ids)$$,
  $$values ('claimed', '00000000-0000-0000-0000-0000000000f6'::uuid)$$,
  'occurrence is claimed by the grandparent');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a6"}', true);
select is(public.claim_occurrence((select reiten from ids)), false, 'a second claim returns false');
select is(
  (select assigned_to from public.occurrences where id = (select reiten from ids)),
  '00000000-0000-0000-0000-0000000000f6'::uuid, 'a second claim changes nothing');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b6"}', true);
select is(public.claim_occurrence((select zahnarzt from ids)), false, 'member of another family cannot claim');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a6"}', true);
select public.cancel_occurrence((select zahnarzt from ids));
select is(public.claim_occurrence((select zahnarzt from ids)), false, 'cancelled occurrence cannot be claimed');

update public.occurrences set assigned_to = auth.uid() where id = (select reiten from ids);
select is(
  (select assigned_to from public.occurrences where id = (select reiten from ids)),
  '00000000-0000-0000-0000-0000000000f6'::uuid, 'claims cannot be taken over by a direct update');

-- Release ---------------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e6"}', true);
select is(
  (select assigned_to from public.occurrences where id = (select reiten from ids)),
  '00000000-0000-0000-0000-0000000000f6'::uuid, 'every member sees who took it');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b6"}', true);
select throws_ok(
  $$select public.release_occurrence((select reiten from ids))$$,
  '42501', null, 'parent of another family cannot release');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000f6"}', true);
select is(public.release_occurrence((select reiten from ids)), true, 'assigned person can release');
select results_eq(
  $$select status::text, assigned_to from public.occurrences where id = (select reiten from ids)$$,
  $$values ('open', null::uuid)$$,
  'released occurrence is open again');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e6"}', true);
select is(public.claim_occurrence((select reiten from ids)), true, 'released occurrence can be claimed again');

-- equal rights (2026-09-29): any member may release someone else's claim
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000f6"}', true);
select is(public.release_occurrence((select reiten from ids)), true, 'grandparent can release someone else''s claim');
select is(public.release_occurrence((select reiten from ids)), false, 'releasing an open occurrence returns false');

reset role;
select is(
  (select count(*)::int from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'occurrences'),
  1, 'occurrences are published for realtime');

select * from finish();
rollback;
