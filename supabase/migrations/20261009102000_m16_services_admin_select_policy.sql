drop policy if exists services_admin_select on public.services;
create policy services_admin_select
on public.services
for select
to authenticated
using ((select private.is_super_admin()));
