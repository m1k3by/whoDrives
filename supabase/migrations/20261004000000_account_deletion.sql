-- Step 8: account deletion.
-- Deleting the auth user (Edge Function delete-account) cascades:
--   profiles -> family_members, push_tokens, notification_outbox
--   occurrences.assigned_to, invites.created_by/used_by, events.created_by -> null
--   (claimed occurrences stay, shown as "ehemaliges Mitglied")
-- New here: when the last member of a family is gone (account deleted or left),
-- the family is deleted with its children, events and occurrences. Otherwise first
-- names of children would stay in the database without anybody who can see them.

create function public.delete_family_without_members()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.family_members where family_id = old.family_id) then
    delete from public.families where id = old.family_id;
  end if;
  return null;
end;
$$;

create trigger on_last_member_gone
  after delete on public.family_members
  for each row execute function public.delete_family_without_members();
