-- M09: authoritative course catalog foundation required by the learner portal.
-- Existing deployments keep their established courses table unchanged; clean
-- replays get the canonical minimal catalog used by the academy and admission APIs.

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 2 and 180),
  description text not null default '' check (char_length(description) <= 10000),
  price_dzd numeric(12,2) check (price_dzd is null or price_dzd >= 0),
  duration text not null default '' check (char_length(duration) <= 160),
  status text not null default 'draft'
    check (status in ('draft','published','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);

create index if not exists courses_publication_title_idx
  on public.courses(status, title);

alter table public.courses enable row level security;

drop policy if exists courses_public_catalog_read on public.courses;
create policy courses_public_catalog_read on public.courses
  for select to anon, authenticated using (
    coalesce(
      to_jsonb(courses)->>'published' = 'true',
      to_jsonb(courses)->>'is_published' = 'true',
      to_jsonb(courses)->>'is_active' = 'true',
      to_jsonb(courses)->>'active' = 'true',
      to_jsonb(courses)->>'visibility' in ('published','public'),
      to_jsonb(courses)->>'status' in ('published','active','public'),
      false
    )
    or (select private.is_super_admin())
  );

drop policy if exists courses_admin_insert on public.courses;
create policy courses_admin_insert on public.courses
  for insert to authenticated with check ((select private.is_super_admin()));
drop policy if exists courses_admin_update on public.courses;
create policy courses_admin_update on public.courses
  for update to authenticated using ((select private.is_super_admin()))
  with check ((select private.is_super_admin()));
drop policy if exists courses_admin_delete on public.courses;
create policy courses_admin_delete on public.courses
  for delete to authenticated using ((select private.is_super_admin()));

grant select on public.courses to anon, authenticated;
grant insert, update, delete on public.courses to authenticated;
