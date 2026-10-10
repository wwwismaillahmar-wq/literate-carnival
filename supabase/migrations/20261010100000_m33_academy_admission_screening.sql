-- M33/M34: course-specific pre-enrollment screening and admission workflow.
-- This migration does not enroll users or mark payments as settled.
create table if not exists public.academy_admission_questions (
  id uuid primary key default gen_random_uuid(),
  course_id text not null check (length(course_id) between 1 and 120),
  prompt text not null check (length(prompt) between 5 and 2000),
  question_type text not null default 'text' check (question_type in ('text','single_choice','yes_no')),
  options jsonb not null default '[]'::jsonb check (jsonb_typeof(options) = 'array' and jsonb_array_length(options) <= 20),
  required boolean not null default true,
  sort_order integer not null default 0 check (sort_order >= 0),
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists academy_admission_questions_course_idx
  on public.academy_admission_questions(course_id, active, sort_order);

create table if not exists public.academy_admission_applications (
  id uuid primary key default gen_random_uuid(),
  course_id text not null check (length(course_id) between 1 and 120),
  user_id uuid references auth.users(id) on delete set null,
  applicant_name text not null check (length(applicant_name) between 2 and 160),
  applicant_email text not null check (length(applicant_email) between 3 and 254),
  applicant_phone text not null check (length(applicant_phone) between 6 and 30),
  answers jsonb not null default '{}'::jsonb check (jsonb_typeof(answers) = 'object'),
  screening_version jsonb not null default '{}'::jsonb check (jsonb_typeof(screening_version) = 'object'),
  consent_at timestamptz not null,
  status text not null default 'submitted' check (status in ('submitted','under_review','accepted','rejected','needs_information','payment_pending','paid','enrolled','cancelled','expired')),
  reviewer_id uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  review_note text not null default '' check (length(review_note) <= 4000),
  payment_reference text,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (applicant_email = lower(applicant_email))
);
create index if not exists academy_admission_applications_course_status_idx
  on public.academy_admission_applications(course_id, status, submitted_at desc);
create index if not exists academy_admission_applications_user_idx
  on public.academy_admission_applications(user_id, submitted_at desc);
create unique index if not exists academy_admission_applications_pending_identity_unique
  on public.academy_admission_applications(course_id, applicant_email)
  where status in ('submitted','under_review','accepted','needs_information','payment_pending','paid','enrolled');

alter table public.academy_admission_questions enable row level security;
alter table public.academy_admission_applications enable row level security;

drop policy if exists academy_admission_questions_public_active on public.academy_admission_questions;
create policy academy_admission_questions_public_active on public.academy_admission_questions
  for select to anon, authenticated using (active = true);
drop policy if exists academy_admission_questions_admin_all on public.academy_admission_questions;
create policy academy_admission_questions_admin_all on public.academy_admission_questions
  for all to authenticated using ((select private.is_super_admin()))
  with check ((select private.is_super_admin()));

drop policy if exists academy_admission_applications_read_owner_admin on public.academy_admission_applications;
create policy academy_admission_applications_read_owner_admin on public.academy_admission_applications
  for select to authenticated using (user_id = (select auth.uid()) or (select private.is_super_admin()));
drop policy if exists academy_admission_applications_public_submit on public.academy_admission_applications;
create policy academy_admission_applications_public_submit on public.academy_admission_applications
  for insert to anon, authenticated with check (
    status = 'submitted' and reviewer_id is null and reviewed_at is null
    and review_note = '' and payment_reference is null
    and consent_at <= now() and consent_at >= now() - interval '10 minutes'
    and (user_id is null or user_id = (select auth.uid()))
  );
drop policy if exists academy_admission_applications_admin_update on public.academy_admission_applications;
create policy academy_admission_applications_admin_update on public.academy_admission_applications
  for update to authenticated using ((select private.is_super_admin()))
  with check ((select private.is_super_admin()));

grant select on public.academy_admission_questions to anon, authenticated;
grant select on public.academy_admission_applications to authenticated;
grant update on public.academy_admission_applications to authenticated;
