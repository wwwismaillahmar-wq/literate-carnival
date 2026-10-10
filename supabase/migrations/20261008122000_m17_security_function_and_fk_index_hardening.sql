-- M17 test-cycle hardening: close unintended public RPC exposure and index new FK paths.
revoke all on function public.handle_new_user() from public, anon, authenticated;
-- Some deployed environments installed this optional event-trigger helper;
-- the clean migration history never created it. Revoke only when present.
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    execute 'revoke all on function public.rls_auto_enable() from public, anon, authenticated';
  end if;
end;
$$;

create index if not exists cart_items_product_id_idx on public.cart_items(product_id);
-- Featured content is stored on posts/contributions in this schema lineage;
-- the former content_featured table is not part of the migration history.
create index if not exists fulfillment_tasks_assigned_to_idx on public.fulfillment_tasks(assigned_to);
create index if not exists inventory_movements_actor_id_idx on public.inventory_movements(actor_id);
create index if not exists order_items_product_id_idx on public.order_items(product_id);
create index if not exists orders_cart_id_idx on public.orders(cart_id);
create index if not exists payments_payer_id_idx on public.payments(payer_id);
create index if not exists service_appointments_assigned_to_idx on public.service_appointments(assigned_to);
create index if not exists service_appointments_request_id_idx on public.service_appointments(request_id);
create index if not exists service_requests_service_id_idx on public.service_requests(service_id);
create index if not exists service_workflow_actor_id_idx on public.service_workflow(actor_id);
