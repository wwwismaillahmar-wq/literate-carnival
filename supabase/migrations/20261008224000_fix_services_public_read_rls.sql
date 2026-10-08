-- M16: public service catalog must not call private admin helpers for anonymous readers.
drop policy if exists services_public_read on public.services;
create policy services_public_read on public.services
for select to anon, authenticated
using (active = true);
