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
create policy notifications_owner_update on public.notifications for update to authenticated using (recipient_id=(select auth.uid())) with check (recipient_id=¶»§q«^