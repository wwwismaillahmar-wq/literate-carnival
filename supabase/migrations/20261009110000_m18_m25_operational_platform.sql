-- M18-M25 operational communications, verified reviews, analytics and security.
create table if not exists public.notifications (
 id uuid primary key default gen_random_uuid(),
 recipient_id uuid not null references auth.users(id) on delete cascade,
 notification_type text not null check (notification_type in ('order','payment','service','support','review','system')),
 title text not null check (char_length(title) between 1 and 160),
 body text not null default '' check (char_length(body) <= 2000),
 href text, dedupe_key text unique,
 metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata)='object'),
 read_at timestamptz, created_at timestamptz not null default now()
);
create index if not exists notifications_recipient_created_idx on public.notifications(recipient_id,created_at desc);
create index if not exists notifications_unread_idx on public.notifications(recipient_id,created_at desc) where read_at is null;
alter table public.notifications enable row level security;
drop policy if exists notifications_owner_read on public.notifications;
create policy notifications_owner_read on public.notifications for select to authenticated using (recipient_id=(select auth.uid()) or (select private.is_super_admin((select auth.uid()))));
drop policy if exists notifications_owner_update on public.notifications;
create policy notifications_owner_update on public.notifications for update to authenticated using (recipient_id=(select auth.uid())) with check (recipient_id=(select auth.uid()));
drop policy if exists notifications_admin_all on public.notifications;
create policy notifications_admin_all on public.notifications for all to authenticated using ((select private.is_super_admin((select auth.uid())))) with check ((select private.is_super_admin((select auth.uid()))));
revoke insert,delete on public.notifications from anon,authenticated;
revoke update on public.notifications from authenticated;
grant update(read_at) on public.notifications to authenticated;

create table if not exists public.support_tickets (
 id uuid primary key default gen_random_uuid(),
 ticket_number text not null unique default ('ASL-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,10))),
 customer_id uuid not null references auth.users(id) on delete cascade,
 category text not null check (category in ('order','payment','service','academy','account','complaint','suggestion','other')),
 subject text not null check (char_length(subject) between 4 and 160),
 message text not null check (char_length(message) between 10 and 10000),
 status text not null default 'open' check (status in ('open','in_progress','waiting_customer','resolved','closed')),
 priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
 assigned_to uuid references auth.users(id) on delete set null,
 admin_reply text not null default '' check (char_length(admin_reply)<=10000),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), resolved_at timestamptz
);
create index if not exists support_tickets_customer_created_idx on public.support_tickets(customer_id,created_at desc);
create index if not exists support_tickets_queue_idx on public.support_tickets(status,priority,created_at);
alter table public.support_tickets enable row level security;
revoke insert on public.support_tickets from anon,authenticated;
grant insert(customer_id,category,subject,message) on public.support_tickets to authenticated;
drop policy if exists support_tickets_owner_read on public.support_tickets;
create policy support_tickets_owner_read on public.support_tickets for select to authenticated using (customer_id=(select auth.uid()) or (select private.is_super_admin((select auth.uid()))));
drop policy if exists support_tickets_owner_insert on public.support_tickets;
create policy support_tickets_owner_insert on public.support_tickets for insert to authenticated with check (customer_id=(select auth.uid()));
drop policy if exists support_tickets_admin_update on public.support_tickets;
create policy support_tickets_admin_update on public.support_tickets for update to authenticated using ((select private.is_super_admin((select auth.uid())))) with check ((select private.is_super_admin((select auth.uid()))));
drop policy if exists support_tickets_admin_delete on public.support_tickets;
create policy support_tickets_admin_delete on public.support_tickets for delete to authenticated using ((select private.is_super_admin((select auth.uid()))));

create table if not exists public.reviews (
 id uuid primary key default gen_random_uuid(),
 reviewer_id uuid not null references auth.users(id) on delete cascade,
 subject_type text not null check (subject_type in ('product','service')),
 subject_id text not null, rating integer not null check (rating between 1 and 5),
 body text not null default '' check (char_length(body)<=3000),
 status text not null default 'pending' check (status in ('pending','approved','rejected')),
 verified_transaction boolean not null default false,
 created_at timestamptz not null default now(), reviewed_at timestamptz,
 reviewed_by uuid references auth.users(id) on delete set null,
 unique(reviewer_id,subject_type,subject_id)
);
create index if not exists reviews_subject_public_idx on public.reviews(subject_type,subject_id,status,created_at desc);
create index if not exists reviews_admin_queue_idx on public.reviews(status,created_at desc);
alter table public.reviews enable row level security;
drop policy if exists reviews_public_approved_read on public.reviews;
create policy reviews_public_approved_read on public.reviews for select to anon,authenticated using (status='approved');
drop policy if exists reviews_owner_read on public.reviews;
create policy reviews_owner_read on public.reviews for select to authenticated using (reviewer_id=(select auth.uid()) or (select private.is_super_admin((select auth.uid()))));
drop policy if exists reviews_admin_update on public.reviews;
create policy reviews_admin_update on public.reviews for update to authenticated using ((select private.is_super_admin((select auth.uid())))) with check ((select private.is_super_admin((select auth.uid()))));
revoke insert,delete on public.reviews from anon,authenticated;

create table if not exists public.analytics_events (
 id bigint generated always as identity primary key,
 event_name text not null check (event_name in ('page_view','product_view','add_to_cart','checkout_started','order_created','payment_started','payment_completed','service_request_created','course_enrollment_started','support_ticket_created')),
 path text not null check (char_length(path) between 1 and 500 and left(path,1)='/'),
 referrer_host text check (referrer_host is null or char_length(referrer_host)<=255),
 utm_source text check (utm_source is null or char_length(utm_source)<=120),
 utm_campaign text check (utm_campaign is null or char_length(utm_campaign)<=160),
 user_id uuid references auth.users(id) on delete set null,
 metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata)='object'),
 created_at timestamptz not null default now()
);
create index if not exists analytics_events_created_name_idx on public.analytics_events(created_at desc,event_name);
create index if not exists analytics_events_path_created_idx on public.analytics_events(path,created_at desc);
alter table public.analytics_events enable row level security;
drop policy if exists analytics_events_public_insert on public.analytics_events;
create policy analytics_events_public_insert on public.analytics_events for insert to anon,authenticated
with check (
 event_name in ('page_view','product_view','add_to_cart','checkout_started','course_enrollment_started')
 and (user_id is null or user_id=(select auth.uid()))
 and jsonb_typeof(metadata)='object'
);
drop policy if exists analytics_events_admin_read on public.analytics_events;
create policy analytics_events_admin_read on public.analytics_events for select to authenticated using ((select private.is_super_admin((select auth.uid()))));
revoke update,delete on public.analytics_events from anon,authenticated;

create or replace function public.submit_verified_review(p_subject_type text,p_subject_id text,p_rating integer,p_body text)
returns uuid language plpgsql security definer set search_path=public,private as $function$
declare v_user uuid:=auth.uid(); v_ok boolean:=false; v_id uuid; v_product bigint; v_service uuid;
begin
 if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
 if p_rating is null or p_rating<1 or p_rating>5 then raise exception 'INVALID_RATING'; end if;
 if char_length(coalesce(p_body,''))>3000 then raise exception 'REVIEW_TOO_LONG'; end if;
 if p_subject_type='product' then
  begin v_product:=p_subject_id::bigint; exception when others then raise exception 'INVALID_PRODUCT'; end;
  select exists(select 1 from public.order_items oi join public.orders o on o.id=oi.order_id where oi.product_id=v_product and o.user_id=v_user and o.status='fulfilled') into v_ok;
 elsif p_subject_type='service' then
  begin v_service:=p_subject_id::uuid; exception when others then raise exception 'INVALID_SERVICE'; end;
  select exists(select 1 from public.service_requests sr where sr.id=v_service and sr.customer_id=v_user and sr.status='completed') into v_ok;
 else raise exception 'UNSUPPORTED_REVIEW_TYPE'; end if;
 if not v_ok then raise exception 'VERIFIED_TRANSACTION_REQUIRED'; end if;
 insert into public.reviews(reviewer_id,subject_type,subject_id,rating,body,verified_transaction)
 values(v_user,p_subject_type,p_subject_id,p_rating,trim(coalesce(p_body,'')),true) returning id into v_id;
 return v_id;
end; $function$;
revoke all on function public.submit_verified_review(text,text,integer,text) from public,anon;
grant execute on function public.submit_verified_review(text,text,integer,text) to authenticated;
