-- Local test data. Login via OTP: the code shows up in Mailpit (http://127.0.0.1:58324).
--   mama@example.com  parent,      Familie Muster
--   oma@example.com   grandparent, Familie Muster
--   fremd@example.com parent,      Familie Beispiel (for isolation checks)

insert into auth.users (
  instance_id, id, aud, role, email, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new
)
select '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email, now(),
       '{"provider":"email","providers":["email"]}', '{}', now(), now(),
       '', '', '', ''
  from (values
    ('11111111-1111-1111-1111-111111111111'::uuid, 'mama@example.com'),
    ('22222222-2222-2222-2222-222222222222'::uuid, 'oma@example.com'),
    ('33333333-3333-3333-3333-333333333333'::uuid, 'fremd@example.com')
  ) as u (id, email);

insert into auth.identities (id, user_id, provider_id, provider, identity_data, created_at, updated_at)
select gen_random_uuid(), id, id::text, 'email',
       jsonb_build_object('sub', id::text, 'email', email, 'email_verified', true), now(), now()
  from auth.users;

update public.profiles set display_name = 'Mama' where id = '11111111-1111-1111-1111-111111111111';
update public.profiles set display_name = 'Oma'  where id = '22222222-2222-2222-2222-222222222222';
update public.profiles set display_name = 'Fremd' where id = '33333333-3333-3333-3333-333333333333';

insert into public.families (id, name, created_by) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Familie Muster',   '11111111-1111-1111-1111-111111111111'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Familie Beispiel', '33333333-3333-3333-3333-333333333333');

insert into public.family_members (family_id, user_id, role) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'grandparent');
