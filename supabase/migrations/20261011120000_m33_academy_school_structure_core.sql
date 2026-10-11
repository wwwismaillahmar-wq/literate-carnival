-- ASLAN Academy: activate the multi-school structure safely for the first launch.
-- The existing course catalog remains canonical; this migration adds school/branch delivery.
create table if not exists public.academy_schools (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null check (length(name) between 2 and 180),
  description text not null default '' check (length(description) <= 5000),
  default_language text not null default 'ar' check (default_language in ('ar','fr','en','es','de','it')),
  supported_languages text[] not null default array['ar','fr','en','es','de','it']::text[],
  status text not null default 'draft' check (status in ('draft','active','suspended','archived')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (cardinality(supported_languages) between 1 and 6),
  check (supported_languages <@ array['ar','fr','en','es','de','it']::text[]),
  check (default_language = any(supported_languages)),
  unique(id, status)
);
create index if not exists academy_schools_status_name_idx on public.academy_schools(status, name);

create table if not exists public.academy_branches (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.academy_schools(id) on delete cascade,
  slug text not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null check (length(name) between 2 and 180),
  address text not null default '' check (length(address) <= 1000),
  timezone text not null default 'Africa/Algiers' check (length(timezone) between 1 and 80),
  language text not null default 'ar' check (language in ('ar','fr','en','es','de','it')),
  status text not null default 'draft' check (status in ('draft','active','suspended','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(school_id, slug),
  unique(id, school_id)
);
create index if not exists academy_branches_school_status_idx on public.academy_branches(school_id, status, name);

create table if not exists public.academy_school_memberships (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.academy_schools(id) on delete cascade,
  branch_id uuid,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','admin','instructor','reviewer')),
  status text not null default 'invited' check (status in ('invited','active','suspended','revoked')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (branch_id, school_id) references public.academy_branches(id, school_id) on delete cascade
);
create unique index if not exists academy_school_memberships_scope_unique
  on public.academy_school_memberships(school_id, user_id, coalesce(branch_id, '00000000-0000-0000-0000-000000000000'::uuid));
create index if not exists academy_school_memberships_user_status_idx on public.academy_school_memberships(user_id, status, school_id);

create table if not exists public.academy_course_offerings (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.academy_schools(id) on delete cascade,
  branch_id uuid,
  course_id uuid not null references public.courses(id) on delete restrict,
  language text not null check (language in ('ar','fr','en','es','de','it')),
  status text not null default 'draft' check (status in ('draft','published','archived')),
  capacity integer check (capacity is null or capacity between 1 and 1000000),
  starts_at timestamptz,
  ends_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (branch_id, school_id) references public.academy_branches(id, school_id) on delete cascade,
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);
create unique index if not exists academy_course_offerings_scope_unique
  on public.academy_course_offerings(school_id, coalesce(branch_id, '00000000-0000-0000-0000-000000000000'::uuid), course_id, language);
create index if not exists academy_course_offerings_public_idx
  on public.academy_course_offerings(school_id, branch_id, language, status, starts_at);

alter table public.academy_schools enable row level security;
alter table public.academy_branches enable row level security;
alter table public.academy_school_memberships enable row level security;
alter table public.academy_course_offerings enable row level security;

drop policy if exists academy_schools_active_read_core on public.academy_schools;
create policy academy_schools_active_read_core on public.academy_schools
  for select to anon, authenticated using (status = 'active' or (select private.is_super_admin()));
drop policy if exists academy_schools_admin_write_core on public.academy_schools;
create policy academy_schools_admin_write_core on public.academy_schools
  for all to authenticated using ((select private.is_super_admin()))
  with check ((select private.is_super_admin()));

drop policy if exists academy_branches_active_read_core on public.academy_branches;
create policy academy_branches_active_read_core on public.academy_branches
  for select to anon, authenticated using (
    (status = 'active' and exists (select 1 from public.academy_schools s where s.id = school_id and s.status = 'active'))
    or (select private.is_super_admin())
  );
drop policy if exists academy_branches_admin_write_core on public.academy_branches;
create policy academy_branches_admin_write_core on public.academy_branches
  for all to authenticated using ((select private.is_super_admin()))
  with check ((select private.is_super_admin()));

drop policy if exists academy_memberships_owner_admin_read_core on public.academy_school_memberships;
create policy academy_memberships_owner_admin_read_core on public.academy_school_memberships
  for select to authenticated using (user_id = (select auth.uid()) or (select private.is_super_admin()));
drop policy if exists academy_memberships_admin_write_core on public.academy_school_memberships;
create policy academy_memberships_admin_write_core on public.academy_school_memberships
  for all to authenticated using ((select private.is_super_admin()))
  with check ((select private.is_super_admin()));

drop policy if exists academy_offerings_published_read_core on public.academy_course_offerings;
create policy academy_offerings_published_read_core on public.academy_course_offerings
  for select to anon, authenticated using (
    (status = 'published'
      and exists (select 1 from public.academy_schools s where s.id = school_id and s.status = 'active')
      and (branch_id is null or exists (
        select 1 from public.academy_branches b
        where b.id = academy_course_offerings.branch_id
          and b.school_id = academy_course_offerings.school_id and b.status = 'active'
      )))
    or (select private.is_super_admin())
  );
drop policy if exists academy_offerings_admin_write_core on public.academy_course_offerings;
create policy academy_offerings_admin_write_core on public.academy_course_offerings
  for all to authenticated using ((select private.is_super_admin()))
  with check ((select private.is_super_admin()));

grant select on public.academy_schools, public.academy_branches, public.academy_course_offerings to anon, authenticated;
grant select, insert, update, delete on public.academy_schools, public.academy_branches,
  public.academy_school_memberships, public.academy_course_offerings to authenticated;
