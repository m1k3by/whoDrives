begin;
select plan(3);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000e1', 'profile@test.local');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e1"}', true);

select lives_ok(
  $$update public.profiles set display_name = 'Opa Heinz' where id = auth.uid()$$,
  'user can set own display name');

select is(
  (select display_name from public.profiles where id = auth.uid()),
  'Opa Heinz', 'display name is stored');

select throws_ok(
  $$update public.profiles set display_name = repeat('x', 51) where id = auth.uid()$$,
  '23514', null, 'display name longer than 50 characters is rejected');

select * from finish();
rollback;
