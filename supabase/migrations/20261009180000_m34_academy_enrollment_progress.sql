-- M34: learner enrollment and lesson progress. Payment state is intentionally not changed here.
create table if not exists public.academy_enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id text not null check (length(course_id) between 1 and 120),
  status text not null default 'enrolled' check (status in ('enrolled','completed','cancelled')),
  enrolled_at timestamptz not null default now(),
  completed_at timestamptz,
  unique(user_id, course_id)
);
create index if not exists academy_enrollments_user_created_idx
  on public.academy_enrollments(user_id, enrolled_at desc);
create table if not exists public.academy_lesson_progress (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.academy_enrollments(id) on delete cascade,
  lesson_id uuid not null references public.academy_lessons(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  completed boolean not null default false,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique(enrollment_id, lesson_id),
  check ((completed and completed_at is not null) or (not completed and completed_at is null))
);
create index if not exists academy_lesson_progress_user_idx
  on public.academy_lesson_progress(user_id, updated_at desc);
alter table public.academy_enrollments enable row level security;
alter table public.academy_lesson_progress enable row level security;
drop policy if exists academy_enrollments_read_own on public.academy_enrollments;
create policy academy_enrollments_read_own on public.academy_enrollments
  for select to authenticated using (user_id = (select auth.uid()) or (select private.is_super_admin()));
drop policy if exists academy_enrollments_insert_own on public.academy_enrollments;
create policy academy_enrollments_insert_own on public.academy_enrollments
  for insert to authenticated with check (user_id = (select auth.uid()) and status = 'enrolled' and completed_at is null);
drop policy if exists academy_enrollments_update_admin on public.academy_enrollments;
create policy academy_enrollments_update_admin on public.academy_enrollments
  for update to authenticated using ((select private.is_super_admin()))
  with check ((select private.is_super_admin()));
drop policy if exists academy_progress_read_own on public.academy_lesson_progress;
create policy academy_progress_read_own on public.academy_lesson_progress
  for select to authenticated using (user_id = (select auth.uid()) or (select private.is_super_admin()));
drop policy if exists academy_progress_insert_own on public.academy_lesson_progress;
create policy academy_progress_insert_own on public.academy_lesson_progress
  for insert to authenticated with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.academy_enrollments e where e.id = enrollment_id and e.user_id = (select auth.uid()) and e.status = 'enrolled')
  );
drop policy if exists academy_progress_update_own on public.academy_lesson_progress;
create policy academy_progress_update_own on public.academy_lesson_progress
  for update to authenticated using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.academy_enrollments e where e.id = enrollment_id and e.user_id = (select auth.uid()) and e.status = 'enrolled')
  );
grant select, insert on public.academy_enrollments to authenticated;
grant update on public.academy_enrollments to authenticated;
grant select, insert, update on public.academy_lesson_progress to authenticated;
