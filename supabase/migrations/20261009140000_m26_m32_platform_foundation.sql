-- M26-M32 platform foundation. Additive only; does not rewrite prior migration history.
create extension if not exists pgcrypto;

create index if not exists notifications_recipient_unread_idx
  on public.notifications(recipient_id, created_at desc) where read_at is null;

create table if not exists public.knowledge_articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title text not null check (length(title) between 3 and 200),
  excerpt text not null default '' check (length(excerpt) <= 500),
  body text not null check (length(body) between 1 and 50000),
  category text not null default 'general' check (length(category) between 1 and 80),
  status text not null default 'draft' check (status in ('draft','published','archived')),
  author_id uuid references auth.users(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists knowledge_articles_public_idx
  on public.knowledge_articles(category, published_at desc) where status = 'published';

create table if not exists public.platform_ai_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  feature text not null check (feature in ('assistant','summarize','classify')),
  provider text not null,
  model text not null,
  input_hash text not null check (length(input_hash) = 64),
  status text not null default 'pending' check (status in ('pending','succeeded','failed')),
  result jsonb,
  error_code text,
  created_at timestamptz not null default now()
);
create index if not exists platform_ai_requests_user_created_idx
  on public.platform_ai_requests(user_id, created_at desc);

create table if not exists public.recommendation_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  context text not null default 'catalog' check (length(context) between 1 and 80),
  product_ids bigint[] not null default '{}',
  algorithm_version text not null default 'rules-v1',
  created_at timestamptz not null default now()
);
create index if not exists recommendation_events_created_idx
  on public.recommendation_events(created_at desc);

create table if not exists public.platform_search_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  query_hash text not null check (length(query_hash) = 64),
  result_count integer not null default 0 check (result_count >= 0),
  filters jsonb not null default '{}'::jsonb check (jsonb_typeof(filters) = 'object'),
  created_at timestamptz not null default now()
);
create index if not exists platform_search_events_created_idx
  on public.platform_search_events(created_at desc);

alter table public.knowledge_articles enable row level security;
alter table public.platform_ai_requests enable row level security;
alter table public.recommendation_events enable row level security;
alter table public.platform_search_events enable row level security;

drop policy if exists knowledge_articles_public_read on public.knowledge_articles;
create policy knowledge_articles_public_read on public.knowledge_articles
  for select to anon, authenticated using (status = 'published' or (select private.is_super_admin()));
drop policy if exists knowledge_articles_admin_insert on public.knowledge_articles;
create policy knowledge_articles_admin_insert on public.knowledge_articles
  for insert to authenticated with check ((select private.is_super_admin()));
drop policy if exists knowledge_articles_admin_update on public.knowledge_articles;
create policy knowledge_articles_admin_update on public.knowledge_articles
  for update to authenticated using ((select private.is_super_admin()))
  with check ((select private.is_super_admin()));
drop policy if exists knowledge_articles_admin_delete on public.knowledge_articles;
create policy knowledge_articles_admin_delete on public.knowledge_articles
  for delete to authenticated using ((select private.is_super_admin()));

drop policy if exists platform_ai_requests_read_own on public.platform_ai_requests;
create policy platform_ai_requests_read_own on public.platform_ai_requests
  for select to authenticated using (user_id = (select auth.uid()) or (select private.is_super_admin()));
drop policy if exists platform_ai_requests_insert_own on public.platform_ai_requests;
create policy platform_ai_requests_insert_own on public.platform_ai_requests
  for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists platform_ai_requests_update_own on public.platform_ai_requests;
create policy platform_ai_requests_update_own on public.platform_ai_requests
  for update to authenticated using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists recommendation_events_insert_own on public.recommendation_events;
create policy recommendation_events_insert_own on public.recommendation_events
  for insert to authenticated with check (user_id = (select auth.uid()) or user_id is null);
drop policy if exists recommendation_events_read_own on public.recommendation_events;
create policy recommendation_events_read_own on public.recommendation_events
  for select to authenticated using (user_id = (select auth.uid()) or (select private.is_super_admin()));

drop policy if exists platform_search_events_insert_own on public.platform_search_events;
create policy platform_search_events_insert_own on public.platform_search_events
  for insert to authenticated with check (user_id = (select auth.uid()) or user_id is null);
drop policy if exists platform_search_events_admin_read on public.platform_search_events;
create policy platform_search_events_admin_read on public.platform_search_events
  for select to authenticated using ((select private.is_super_admin()));

grant select, insert, update, delete on public.knowledge_articles to authenticated;
grant select, insert, update on public.platform_ai_requests to authenticated;
grant select, insert on public.recommendation_events to authenticated;
grant select, insert on public.platform_search_events to authenticated;
grant select on public.knowledge_articles to anon;
