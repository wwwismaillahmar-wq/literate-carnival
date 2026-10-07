-- M04: make the admin write boundary use the same super-admin authority
-- used by the Admin Control Center server actions.

drop policy if exists products_admin_insert on public.products;
create policy products_admin_insert on public.products
  for insert to authenticated
  with check ((select private.is_super_admin()));

drop policy if exists products_admin_update on public.products;
create policy products_admin_update on public.products
  for update to authenticated
  using ((select private.is_super_admin()))
  with check ((select private.is_super_admin()));

drop policy if exists products_admin_delete on public.products;
create policy products_admin_delete on public.products
  for delete to authenticated
  using ((select private.is_super_admin()));

drop policy if exists leads_admin_read on public.leads;
create policy leads_admin_read on public.leads
  for select to authenticated
  using ((select private.is_super_admin()));

drop policy if exists leads_admin_update on public.leads;
create policy leads_admin_update on public.leads
  for update to authenticated
  using ((select private.is_super_admin()))
  with check ((select private.is_super_admin()));

drop policy if exists leads_admin_delete on public.leads;
create policy leads_admin_delete on public.leads
  for delete to authenticated
  using ((select private.is_super_admin()));

drop policy if exists profiles_admin_update on public.profiles;
create policy profiles_admin_update on public.profiles
  for update to authenticated
  using ((select private.is_super_admin()))
  with check ((select private.is_super_admin()));
