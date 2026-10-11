-- M34 integrity hardening: RLS must enforce the same course boundaries as the API.
drop policy if exists academy_enrollments_insert_own on public.academy_enrollments;
create policy academy_enrollments_insert_own on public.academy_enrollments
  for insert to authenticated with check (
    user_id = (select auth.uid())
    and status = 'enrolled'
    and completed_at is null
    and exists (
      select 1 from public.courses c
      where c.id::text = course_id
        and coalesce(
          to_jsonb(c)->>'published' = 'true',
          to_jsonb(c)->>'is_published' = 'true',
          to_jsonb(c)->>'is_active' = 'true',
          to_jsonb(c)->>'active' = 'true',
          to_jsonb(c)->>'visibility' in ('published','public'),
          to_jsonb(c)->>'status' in ('published','active','public'),
          false
        )
    )
  );

drop policy if exists academy_progress_insert_own on public.academy_lesson_progress;
create policy academy_progress_insert_own on public.academy_lesson_progress
  for insert to authenticated with check (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.academy_enrollments e
      join public.academy_lessons l on l.id = lesson_id and l.status = 'published'
      join public.academy_modules m on m.id = l.module_id and m.status = 'published'
      where e.id = enrollment_id
        and e.user_id = (select auth.uid())
        and e.status = 'enrolled'
        and e.course_id = m.course_id
    )
  );

drop policy if exists academy_progress_update_own on public.academy_lesson_progress;
create policy academy_progress_update_own on public.academy_lesson_progress
  for update to authenticated using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.academy_enrollments e
      join public.academy_lessons l on l.id = lesson_id and l.status = 'published'
      join public.academy_modules m on m.id = l.module_id and m.status = 'published'
      where e.id = enrollment_id
        and e.user_id = (select auth.uid())
        and e.status = 'enrolled'
        and e.course_id = m.course_id
    )
  );
