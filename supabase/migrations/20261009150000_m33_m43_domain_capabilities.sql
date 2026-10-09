-- M33-M43 additive domain foundations.
-- This migration intentionally uses independent domain records and auth.users only.
-- Course IDs remain text until the authoritative historical courses schema is restored.

create table if not exists public.academy_modules (
  id uuid primary key default gen_random_uuid(),
  course_id text not null check (length(course_id) between 1 and 120),
  title text not null check (length(title) between 2 and 180),
  description text not null default '' check (length(description) <= 2000),
  sort_order integer not null default 0 check (sort_order >= 0),
  status text not null default 'draft' check (status in ('draft','published','archived')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists academy_modules_course_order_idx
  on public.academy_modules(course_id, sort_order, created_at);

create table if not exists public.academy_lessons (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.academy_modules(id) on delete cascade,
  title text not null check (length(title) between 2 and 180),
  lesson_type text not null default 'text' check (lesson_type in ('text','video','document','link')),
  body text not null default '' check (length(body) <= 50000),
  resource_url text check (resource_url is null or (length(resource_url) <= 2048 and resource_url ~ '^https?://')),
  duration_minutes integer not null default 0 check (duration_minutes between 0 and 1440),
  sort_order integer not null default 0 check (sort_order >= 0),
  status text not null default 'draft' check (status in ('draft','published','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists academy_lessons_module_order_idx
  on public.academy_lessons(module_id, sort_order, created_at);

create table if not exists public.talent_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  headline text not null default '' check (length(headline) <= 160),
  bio text not null default '' check (length(bio) <= 4000),
  skills text[] not null default '{}' check (cardinality(skills) <= 40),
  public_profile boolean not null default false,
  review_status text not null default 'draft' check (review_status in ('draft','pending','verified','rejected')),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists talent_profiles_public_idx
  on public.talent_profiles(updated_at desc) where public_profile = true and review_status = 'verified';

create table if not exists public.talent_evidence (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.talent_profiles(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (length(title) between 2 and 180),
  evidence_type text not null check (evidence_type in ('training','project','experience','certificate','assessment')),
  evidence_url text check (evidence_url is null or (length(evidence_url) <= 2048 and evidence_url ~ '^https?://')),
  notes text not null default '' check (length(notes) <= 2000),
  verification_status text not null default 'unverified' check (verification_status in ('unverified','verified','rejected')),
  verified_by uuid references auth.users(id) on delete set null,
  verified_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists talent_evidence_owner_created_idx
  on public.talent_evidence(owner_id, created_at desc);

create table if not exists public.partner_applications (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete set null,
  contact_name text not null check (length(contact_name) between 2 and 120),
  phone text not null check (length(phone) between 6 and 30),
  email text not null default '' check (length(email) <= 254),
  organization_name text not null check (length(organization_name) between 2 and 180),
  partnership_type text not null check (partnership_type in ('supplier','training','services','business','employment','other')),
  message text not null check (length(message) between 5 and 4000),
  status text not null default 'submitted' check (status in ('submitted','under_review','approved','rejected','closed')),
  admin_note text not null default '' check (length(admin_note) <= 4000),
  assigned_to uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists partner_applications_status_created_idx
  on public.partner_applications(status, created_at desc);
create index if not exists partner_applications_owner_created_idx
  on public.partner_applications(owner_id, created_at desc);

alter table public.academy_modules enable row level security;
alter table public.academy_lessons enable row level security;
alter table public.talent_profiles enable row level security;
alter table public.talent_evidence enable row level security;
alter table public.partner_applications enable row level security;

drop policy if exists academy_modules_admin_all on public.academy_modules;
create policy academy_modules_admin_all on public.academy_modules
  for all to authenticated using ((select private.is_super_admin()))
  with check ((select private.is_super_admin()));
drop policy if exists academy_lessons_admin_all on public.academy_lessons;
create policy academy_lessons_admin_all on public.academy_lessons
  for all to authenticated using ((select private.is_super_admin()))
  with check ((select private.is_super_admin()));

drop policy if exists talent_profiles_select_visible on public.talent_profiles;
create policy talent_profiles_select_visible on public.talent_profiles
  for select to anon, authenticated using (
    (user_id = (select auth.uid()))
    or (public_profile = true and review_status = 'verified')
    or (select private.is_super_admin())
  );
drop policy if exists talent_profiles_insert_own on public.talent_profiles;
create policy talent_profiles_insert_own on public.talent_profiles
  for insert to authenticated with check (
    user_id = (select auth.uid()) and review_status in ('draft','pending') and reviewed_by is null and reviewed_at is null
  );
drop policy if exists talent_profiles_update_own on public.talent_profiles;
create policy talent_profiles_update_own on public.talent_profiles
  for update to authenticated using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and review_status in ('draft','pending','rejected') and reviewed_by is null and reviewed_at is null);
drop policy if exists talent_profiles_admin_all on public.talent_profiles;
create policy talent_profiles_admin_all on public.talent_profiles
  for all to authenticated using ((select private.is_super_admin()))
  with check ((select private.is_super_admin()));

drop policy if exists talent_evidence_select_visible on public.talent_evidence;
create policy talent_evidence_select_visible on public.talent_evidence
  for select to anon, authenticated using (
    owner_id = (select auth.uid())
    or (verification_status = 'verified' and exists (
      select 1 from public.talent_profiles p
      where p.id = profile_id and p.public_profile = true and p.review_status = 'verified'
    ))
    or (select private.is_super_admin())
  );
drop policy if exists talent_evidence_insert_own on public.talent_evidence;
create policy talent_evidence_insert_own on public.talent_evidence
  for insert to authenticated with check (
    owner_id = (select auth.uid()) and verification_status = 'unverified' and verified_by is null and verified_at is null
    and exists (select 1 from public.talent_profiles p where p.id = profile_id and p.user_id = (select auth.uid()))
  );
drop policy if exists talent_evidence_admin_update on public.talent_evidence;
create policy talent_evidence_admin_update on public.talent_evidence
  for update to authenticated using ((select private.is_super_admin()))
  with check ((select private.is_super_admin()));

drop policy if exists partner_applications_public_insert on public.partner_applications;
create policy partner_applications_public_insert on public.partner_applications
  for insert to anon, authenticated with check (
    length(contact_name) between 2 and 120
    and length(phone) between 6 and 30
    and length(organization_name) between 2 and 180
    and length(message) between 5 and 4000
    and status = 'submitted'
    and admin_note = ''
    and assigned_to is null
  );
drop policy if exists partner_applications_owner_read on public.partner_applications;
create policy partner_applications_owner_read on public.partner_applications
  for select to authenticated using (owner_id = (select auth.uid()) or (select private.is_super_admin()));
drop policy if exists partner_applications_admin_update on public.partner_applications;
create policy partner_applications_admin_update on public.partner_applications
  for update to authenticated using ((select private.is_super_admin()))
  with check ((select private.is_super_admin()));

grant select, insert, update, delete on public.academy_modules, public.academy_lessons to authenticated;
grant select, insert, update on public.talent_profiles, public.talent_evidence to authenticated;
grant select, insert, update on public.partner_applications to authenticated;
grant select, insert on public.partner_applications to anon;
grant select on public.talent_profiles, public.talent_evidence to anon;
