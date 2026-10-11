create or replace function public.record_trusted_analytics_event()
returns trigger language plpgsql security definer set search_path=public as $function$
declare v_event text; v_path text; v_user uuid;
begin
 if tg_table_name='orders' and tg_op='INSERT' then
  v_event:='order_created'; v_path:='/checkout'; v_user:=(to_jsonb(new)->>'user_id')::uuid;
 elsif tg_table_name='payments' and tg_op='INSERT' then
  v_event:='payment_started'; v_path:='/invoices'; v_user:=(to_jsonb(new)->>'payer_id')::uuid;
 elsif tg_table_name='payments' and tg_op='UPDATE' and (to_jsonb(new)->>'status')='paid' and (to_jsonb(old)->>'status') is distinct from 'paid' then
  v_event:='payment_completed'; v_path:='/invoices'; v_user:=(to_jsonb(new)->>'payer_id')::uuid;
 elsif tg_table_name='service_requests' and tg_op='INSERT' then
  v_event:='service_request_created'; v_path:='/service-requests'; v_user:=(to_jsonb(new)->>'customer_id')::uuid;
 elsif tg_table_name='support_tickets' and tg_op='INSERT' then
  v_event:='support_ticket_created'; v_path:='/support'; v_user:=(to_jsonb(new)->>'customer_id')::uuid;
 else return new;
 end if;
 insert into public.analytics_events(event_name,path,user_id,metadata)
 values(v_event,v_path,v_user,jsonb_build_object('source','trusted_database_trigger'));
 return new;
end; $function$;
drop trigger if exists analytics_order_created on public.orders;
create trigger analytics_order_created after insert on public.orders for each row execute function public.record_trusted_analytics_event();
drop trigger if exists analytics_payment_started on public.payments;
create trigger analytics_payment_started after insert on public.payments for each row execute function public.record_trusted_analytics_event();
drop trigger if exists analytics_payment_completed on public.payments;
create trigger analytics_payment_completed after update of status on public.payments for each row execute function public.record_trusted_analytics_event();
drop trigger if exists analytics_service_request_created on public.service_requests;
create trigger analytics_service_request_created after insert on public.service_requests for each row execute function public.record_trusted_analytics_event();
drop trigger if exists analytics_support_ticket_created on public.support_tickets;
create trigger analytics_support_ticket_created after insert on public.support_tickets for each row execute function public.record_trusted_analytics_event();
