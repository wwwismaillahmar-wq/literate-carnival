-- M17 RLS policy normalization: preserve access semantics while avoiding per-row auth re-evaluation and duplicate permissive SELECT paths.

drop policy if exists orders_admin_write on public.orders;
create policy orders_admin_write on public.orders for insert to authenticated with check ((select private.is_super_admin()));
create policy orders_admin_update on public.orders for update to authenticated using ((select private.is_super_admin())) with check ((select private.is_super_admin()));
create policy orders_admin_delete on public.orders for delete to authenticated using ((select private.is_super_admin()));

drop policy if exists invoices_admin_write on public.invoices;
create policy invoices_admin_insert on public.invoices for insert to authenticated with check ((select private.is_super_admin()));
create policy invoices_admin_update on public.invoices for update to authenticated using ((select private.is_super_admin())) with check ((select private.is_super_admin()));
create policy invoices_admin_delete on public.invoices for delete to authenticated using ((select private.is_super_admin()));

drop policy if exists payments_admin_write on public.payments;
create policy payments_admin_insert on public.payments for insert to authenticated with check ((select private.is_super_admin()));
create policy payments_admin_update on public.payments for update to authenticated using ((select private.is_super_admin())) with check ((select private.is_super_admin()));
create policy payments_admin_delete on public.payments for delete to authenticated using ((select private.is_super_admin()));

drop policy if exists service_quotes_admin_write on public.service_quotes;
create policy service_quotes_admin_insert on public.service_quotes for insert to authenticated with check ((select private.is_super_admin()));
create policy service_quotes_admin_update on public.service_quotes for update to authenticated using ((select private.is_super_admin())) with check ((select private.is_super_admin()));
create policy service_quotes_admin_delete on public.service_quotes for delete to authenticated using ((select private.is_super_admin()));

drop policy if exists service_appointments_admin_write on public.service_appointments;
create policy service_appointments_admin_insert on public.service_appointments for insert to authenticated with check ((select private.is_super_admin()));
create policy service_appointments_admin_update on public.service_appointments for update to authenticated using ((select private.is_super_admin())) with check ((select private.is_super_admin()));
create policy service_appointments_admin_delete on public.service_appointments for delete to authenticated using ((select private.is_super_admin()));

drop policy if exists service_workflow_admin_write on public.service_workflow;
create policy service_workflow_admin_insert on public.service_workflow for insert to authenticated with check ((select private.is_super_admin()));
create policy service_workflow_admin_update on public.service_workflow for update to authenticated using ((select private.is_super_admin())) with check ((select private.is_super_admin()));
create policy service_workflow_admin_delete on public.service_workflow for delete to authenticated using ((select private.is_super_admin()));

drop policy if exists services_admin_write on public.services;
create policy services_admin_insert on public.services for insert to authenticated with check ((select private.is_super_admin()));
create policy services_admin_update on public.services for update to authenticated using ((select private.is_super_admin())) with check ((select private.is_super_admin()));
create policy services_admin_delete on public.services for delete to authenticated using ((select private.is_super_admin()));

drop policy if exists inventory_admin_write on public.inventory_items;
create policy inventory_admin_insert on public.inventory_items for insert to authenticated with check ((select private.is_super_admin()));
create policy inventory_admin_update on public.inventory_items for update to authenticated using ((select private.is_super_admin())) with check ((select private.is_super_admin()));
create policy inventory_admin_delete on public.inventory_items for delete to authenticated using ((select private.is_super_admin()));

drop policy if exists fulfillment_admin_write on public.fulfillment_tasks;
create policy fulfillment_admin_insert on public.fulfillment_tasks for insert to authenticated with check ((select private.is_super_admin()));
create policy fulfillment_admin_update on public.fulfillment_tasks for update to authenticated using ((select private.is_super_admin())) with check ((select private.is_super_admin()));
create policy fulfillment_admin_delete on public.fulfillment_tasks for delete to authenticated using ((select private.is_super_admin()));

drop policy if exists inventory_admin_read on public.inventory_items;
create policy inventory_admin_read on public.inventory_items for select to authenticated using ((select private.is_super_admin()));
drop policy if exists fulfillment_admin_read on public.fulfillment_tasks;
create policy fulfillment_admin_read on public.fulfillment_tasks for select to authenticated using ((select private.is_super_admin()));
drop policy if exists inventory_movements_admin_read on public.inventory_movements;
create policy inventory_movements_admin_read on public.inventory_movements for select to authenticated using ((select private.is_super_admin()));
drop policy if exists inventory_movements_admin_write on public.inventory_movements;
create policy inventory_movements_admin_insert on public.inventory_movements for insert to authenticated with check ((select private.is_super_admin()));

drop policy if exists carts_owner on public.carts;
create policy carts_owner on public.carts for all to authenticated
using ((user_id = (select auth.uid())) or (select private.is_super_admin()))
with check ((user_id = (select auth.uid())) or (select private.is_super_admin()));

drop policy if exists cart_items_owner on public.cart_items;
create policy cart_items_owner on public.cart_items for all to authenticated
using (exists (select 1 from public.carts c where c.id=cart_items.cart_id and ((c.user_id=(select auth.uid())) or (select private.is_super_admin()))))
with check (exists (select 1 from public.carts c where c.id=cart_items.cart_id and ((c.user_id=(select auth.uid())) or (select private.is_super_admin()))));

drop policy if exists orders_owner on public.orders;
create policy orders_owner on public.orders for select to authenticated using ((user_id = (select auth.uid())) or (select private.is_super_admin()));
drop policy if exists order_items_owner on public.order_items;
create policy order_items_owner on public.order_items for select to authenticated
using (exists (select 1 from public.orders o where o.id=order_items.order_id and ((o.user_id=(select auth.uid())) or (select private.is_super_admin()))));
drop policy if exists invoices_owner on public.invoices;
create policy invoices_owner on public.invoices for select to authenticated using ((customer_id = (select auth.uid())) or (select private.is_super_admin()));
drop policy if exists payments_owner on public.payments;
create policy payments_owner on public.payments for select to authenticated using ((payer_id = (select auth.uid())) or (select private.is_super_admin()));

drop policy if exists service_requests_owner on public.service_requests;
create policy service_requests_owner on public.service_requests for select to authenticated using ((customer_id = (select auth.uid())) or (select private.is_super_admin()));
drop policy if exists service_requests_owner_insert on public.service_requests;
create policy service_requests_owner_insert on public.service_requests for insert to authenticated with check ((customer_id = (select auth.uid())) or (select private.is_super_admin()));
drop policy if exists service_requests_admin_update on public.service_requests;
create policy service_requests_admin_update on public.service_requests for update to authenticated using ((select private.is_super_admin())) with check ((select private.is_super_admin()));

drop policy if exists service_quotes_customer_read on public.service_quotes;
create policy service_quotes_customer_read on public.service_quotes for select to authenticated
using (exists (select 1 from public.service_requests r where r.id=service_quotes.request_id and ((r.customer_id=(select auth.uid())) or (select private.is_super_admin()))));
drop policy if exists service_appointments_customer_read on public.service_appointments;
create policy service_appointments_customer_read on public.service_appointments for select to authenticated
using (exists (select 1 from public.service_requests r where r.id=service_appointments.request_id and ((r.customer_id=(select auth.uid())) or (select private.is_super_admin()))));
drop policy if exists service_workflow_customer_read on public.service_workflow;
create policy service_workflow_customer_read on public.service_workflow for select to authenticated
using (exists (select 1 from public.service_requests r where r.id=service_workflow.request_id and ((r.customer_id=(select auth.uid())) or (select private.is_super_admin()))));

drop policy if exists services_public_read on public.services;
create policy services_public_read on public.services for select to anon, authenticated using ((active = true) or (select private.is_super_admin()));
