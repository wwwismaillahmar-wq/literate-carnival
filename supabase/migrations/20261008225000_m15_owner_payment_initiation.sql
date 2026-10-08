-- M15: allow an authenticated customer to create their own pending payment record.
drop policy if exists payments_owner_insert on public.payments;
create policy payments_owner_insert on public.payments
for insert to authenticated
with check (payer_id = (select auth.uid()));
