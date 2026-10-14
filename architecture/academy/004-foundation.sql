-- ASLAN-ACADEMY-UNIFIED-004 / draft migration for review before production.
-- Adds per-course, per-module or per-lesson configurable mastery policies,
-- production inventory, versioned assessments, practical submissions and release gates.
-- This file is intentionally NOT applied to the live database.
create table if not exists public.academy_mastery_policies (
 id uuid primary key default gen_random_uuid(),
 course_id text not null,
 scope text not null check (scope in ('course','module','lesson')),
 scope_id uuid not null,
 revision integer not null default 1 check (revision > 0),
 policy jsonb not null check (jsonb_typeof(policy) = 'object'),
 status text not null default 'draft' check (status in ('draft','approved','retired')),
 effective_at timestamptz,
 created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(),
 unique (scope,scope_id,revision)
);
create table if not exists public.academy_production_items (
 id uuid primary key default gen_random_uuid(),
 course_id text not null,
 module_id uuid references public.academy_modules(id) on delete set null,
 lesson_id uuid references public.academy_lessons(id) on delete set null,
 title text not null check (length(trim(title)) between 2 and 200),
 status text not null default 'planned' check (status in ('planned','producing','reviewing','testing','approved','published','needs_update','archived')),
 due_at timestamptz,
 planned_release_at timestamptz,
 reviewed_by uuid references auth.users(id),
 approved_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table if not exists public.academy_assessment_versions (
 id uuid primary key default gen_random_uuid(),
 assessment_id uuid not null references public.academy_assessments(id) on delete cascade,
 version integer not null check (version > 0),
 pass_score numeric(5,2) not null check (pass_score between 0 and 100),
 definition jsonb not null check (jsonb_typeof(definition) = 'object'),
 published_at timestamptz,
 created_at timestamptz not null default now(),
 unique (assessment_id,version)
);
create table if not exists public.academy_practical_submissions (
 id uuid primary key default gen_random_uuid(),
 enrollment_id uuid not null references public.academy_enrollments(id) on delete cascade,
 lesson_id uuid not null references public.academy_lessons(id),
 submitted_by uuid not null references auth.users(id),
 object_path text not null,
 status text not null default 'submitted' check (status in ('submitted','under_review','approved','rejected','revision_requested')),
 reviewer_id uuid references auth.users(id),
 rubric jsonb,
 feedback text,
 submitted_at timestamptz not null default now(),
 reviewed_at timestamptz
);
create index if not exists academy_production_course_due_idx on public.academy_production_items(course_id,due_at);
create index if not exists academy_practical_enrollment_idx on public.academy_practical_submissions(enrollment_id,lesson_id);
create index if not exists academy_mastery_course_scope_idx on public.academy_mastery_policies(course_id,scope,scope_id,status);
alter table public.academy_mastery_policies enable row level security;
alter table public.academy_production_items enable row level security;
alter table public.academy_assessment_versions enable row level security;
alter table public.academy_practical_submissions enable row level security;
-- Academy course IDs in academy_enrollments and academy_modules are TEXT,
-- whereas public.courses.id is UUID. The academy course identifier must therefore
-- remain TEXT; a UUID foreign key would make this migration fail.
-- Fail closed by default: no direct client access until explicit audited RLS policies
-- and server endpoints are added. Do not grant anon or authenticated blanket access.
