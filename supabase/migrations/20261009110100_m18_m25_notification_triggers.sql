create or replace function public.touch_support_ticket()
returns trigger language plpgsql set search_path=public as $function$
begin new.updated_at:=now(); return new; end; $function$;
drop trigger if exists support_tickets_touch_updated_at on public.support_tickets;
create trigger support_tickets_touch_updated_at before update on public.support_tickets for each row execute function public.touch_support_ticket();

create or replace function public.notify_admins_of_support_ticket()
returns trigger language plpgsql security definer set search_path=public as $function$
begin
 insert into public.notifications(recipient_id,notification_type,title,body,href,dedupe_key,metadata)
 select ur.user_id,'support','طلب دعم جديد '||new.ticket_number,left(new.subject||': '||new.message,180),
 '/admin/communications','support:'||new.id::text||':created',jsonb_build_object('ticket_id',new.id)
 from public.user_roles ur join public.roles r on r.id=ur.role_id where r.key='super_admin'
 on conflict(dedupe_key) do nothing;
 return new;
end; $function$;
drop trigger if exists support_ticket_admin_notification on public.support_tickets;
create trigger support_ticket_admin_notification after insert on public.support_tickets for each row execute function public.notify_admins_of_support_ticket();

create or replace function public.notify_customer_of_ticket_update()
returns trigger language plpgsql security definer set search_path=public as $function$
begin
 if new.status is distinct from old.status or new.admin_reply is distinct from old.admin_reply then
  insert into public.notifications(recipient_id,notification_type,title,body,href,dedupe_key,metadata)
  values(new.customer_id,'support','تحديث طلب الدعم '||new.ticket_number,
   case when new.admin_reply is distinct from old.admin_reply and length(trim(new.admin_reply))>0 then left(new.admin_reply,180) else 'تغيرت حالة طلب الدعم إلى: '||new.status end,
   '/support','support:'||new.id::text||':'||new.updated_at::text,jsonb_build_object('ticket_id',new.id,'status',new.status))
  on conflict(dedupe_key) do nothing;
 end if;
 return new;
end; $function$;
drop trigger if exists support_ticket_customer_notification on public.support_tickets;
create trigger support_ticket_customer_notification after update on public.support_tickets for each row execute function public.notify_customer_of_ticket_update();

create or replace function public.notify_customer_of_order()
returns trigger language plpgsql security definer set search_path=public as $function$
begin
 insert into public.notifications(recipient_id,notification_type,title,body,href,dedupe_key,metadata)
 values(new.user_id,'order','تم استلام طلبك '||new.order_number,'تم إنشاء الطلب بنجاح. يمكنك متابعة حالته من حسابك.','/orders',
 'order:'||new.id::text||':created',jsonb_build_object('order_id',new.id,'order_number',new.order_number))
 on conflict(dedupe_key) do nothing;
 return new;
end; $function$;
drop trigger if exists order_created_notification on public.orders;
create trigger order_created_notification after insert on public.orders for each row execute function public.notify_customer_of_order();

create or replace function public.notify_customer_of_payment()
returns trigger language plpgsql security definer set search_path=public as $function$
begin
 if new.status is distinct from old.status then
  insert into public.notifications(recipient_id,notification_type,title,body,href,dedupe_key,metadata)
  values(new.payer_id,'payment','تحديث الدفع','حالة عملية الدفع: '||new.status,'/invoices',
  'payment:'||new.id::text||':'||new.status,jsonb_build_object('payment_id',new.id,'invoice_id',new.invoice_id,'status',new.status))
  on conflict(dedupe_key) do nothing;
 end if;
 return new;
end; $function$;
drop trigger if exists payment_status_notification on public.payments;
create trigger payment_status_notification after update of status on public.payments for each row execute function public.notify_customer_of_payment();

create or replace function public.notify_customer_of_service_status()
returns trigger language plpgsql security definer set search_path=public as $function$
begin
 if new.status is distinct from old.status then
  insert into public.notifications(recipient_id,notification_type,title,body,href,dedupe_key,metadata)
  values(new.customer_id,'service','تحديث طلب الخدمة '||new.request_number,'الحالة الجديدة: '||new.status,'/service-requests',
  'service:'||new.id::text||':'||new.status,jsonb_build_object('request_id',new.id,'status',new.status))
  on conflict(dedupe_key) do nothing;
 end if;
 return new;
end; $function$;
drop trigger if exists service_status_notification on public.service_requests;
create trigger service_status_notification after update of status on public.service_requests for each row execute function public.notify_customer_of_service_status();

create or replace function public.notify_reviewer_of_moderation()
returns trigger language plpgsql security definer set search_path=public as $function$
begin
 if new.status is distinct from old.status and new.status in ('approved','rejected') then
  insert into public.notifications(recipient_id,notification_type,title,body,href,dedupe_key,metadata)
  values(new.reviewer_id,'review','تمت مراجعة تقييمك',
  case when new.status='approved' then 'تم اعتماد تقييمك ونشره.' else 'لم يتم اعتماد تقييمك.' end,
  '/reviews','review:'||new.id::text||':'||new.status,jsonb_build_object('review_id',new.id,'status',new.status))
  on conflict(dedupe_key) do nothing;
 end if;
 return new;
end; $function$;
drop trigger if exists review_moderation_notification on public.reviews;
create trigger review_moderation_notification after update of status on public.reviews for each row execute function public.notify_reviewer_of_moderation();
