-- Parents can revoke (delete) invites of their family.
create policy "invites_delete_parents" on public.invites
  for delete to authenticated
  using (public.is_family_parent(family_id));
