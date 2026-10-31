-- ASLAN Academy: single publishing engine, independent audience visibility.
-- Apply only after reviewing dependent academy routes and storage access.
alter table public.courses
  add column if not exists visibility text not null default 'restricted';
alter table public.courses drop constraint if exists courses_visibility_check;
alter table public.courses add constraint courses_visibility_check
  check (visibility in ('restricted','public'));

create table if not exists public.academy_course_testers (
  course_id uuid not null references public.courses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  granted_by uuid references auth.users(id),
  granted_at timestamptz not null default now(),
  primary key (course_id,user_id)
);
create index if not exists academy_course_testers_user_idx on public.academy_course_testers(user_id);
alter table public.academy_course_testers enable row level security;
revoke all on public.academy_course_testers from anon, authenticated;
grant select,insert,delete on public.academy_course_testers to authenticated;
drop policy if exists academy_course_testers_admin on public.academy_course_testers;
create policy academy_course_testers_admin on public.academy_course_testers
  for all to authenticated
  using ((select private.is_super_admin()))
  with check ((select private.is_super_admin()));
drop policy if exists academy_course_testers_self on public.academy_course_testers;
create policy academy_course_testers_self on public.academy_course_testers
  for select to authenticated using (user_id = (select auth.uid()));

-- All public course reads must use the same published+visibility rule.
drop policy if exists courses_public_catalog_read on public.courses;
create policy courses_public_catalog_read on public.courses
  for select to anon, authenticated
  using (
    status='published' and (
      visibility='public' or (
        visibility='restricted' and (select auth.uid()) is not null
        and exists (select 1 from public.academy_course_testers t
                    where t.course_id=courses.id and t.user_id=(select auth.uid()))
      )
    )
  );
-- Restrict module metadata, including unpublished parent courses.
drop policy if exists academy_modules_published_read on public.academy_modules;
create policy academy_modules_published_read on public.academy_modules
  for select to anon,authenticated
  using (status='published' and exists (
    select 1 from public.courses c
    where c.id::text=academy_modules.course_id and c.status='published'
    and (c.visibility='public' or exists (
      select 1 from public.academy_course_testers t
      where t.course_id=c.id and t.user_id=(select auth.uid())
    ))
  ));
-- Existing learner lesson access enforces enrollment, and now course visibility too.
create or replace function private.can_access_academy_lesson(p_lesson_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $function$
 select auth.uid() is not null and exists(
 select 1 from public.academy_lessons l
 join public.academy_modules m on m.id=l.module_id
 join public.courses c on c.id::text=m.course_id
 where l.id=p_lesson_id and (
 public.can_manage_academy_course(m.course_id)
 or (
 l.status='published' and m.status='published' and c.status='published'
 and (c.visibility='public' or exists (
   select 1 from public.academy_course_testers t
   where t.course_id=c.id and t.user_id=auth.uid()
 ))
 and exists(
 select 1 from public.academy_enrollments e
 where e.user_id=auth.uid() and e.course_id=m.course_id
 and e.status in ('enrolled','completed')
 and (c.lesson_release_mode='open' or not exists(
 select 1 from public.academy_lessons prior
 join public.academy_modules pm on pm.id=prior.module_id
 where pm.course_id=m.course_id and prior.status='published' and pm.status='published'
 and (pm.sort_order,pm.created_at,pm.id,prior.sort_order,prior.created_at,prior.id)
     <(m.sort_order,m.created_at,m.id,l.sort_order,l.created_at,l.id)
 and not exists(select 1 from public.academy_lesson_progress p
 where p.enrollment_id=e.id and p.lesson_id=prior.id and p.completed)
 ))
 )
 ))
 );
$function$;
