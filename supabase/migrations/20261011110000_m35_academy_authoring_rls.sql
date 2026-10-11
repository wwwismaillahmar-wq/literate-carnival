-- M35: scoped authoring permissions for assigned academy staff.
create or replace function public.can_manage_academy_module(p_module_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select coalesce((select public.can_manage_academy_course(m.course_id) from public.academy_modules m where m.id = p_module_id), false);
$$;
create or replace function public.can_manage_academy_assessment(p_assessment_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select coalesce((select public.can_manage_academy_course(m.course_id) from public.academy_assessments a join public.academy_modules m on m.id = a.module_id where a.id = p_assessment_id), false);
$$;
revoke all on function public.can_manage_academy_module(uuid) from public, anon;
revoke all on function public.can_manage_academy_assessment(uuid) from public, anon;
grant execute on function public.can_manage_academy_module(uuid) to authenticated;
grant execute on function public.can_manage_academy_assessment(uuid) to authenticated;
drop policy if exists academy_modules_assigned_staff_all on public.academy_modules;
create policy academy_modules_assigned_staff_all on public.academy_modules for all to authenticated
using (public.can_manage_academy_course(course_id)) with check (public.can_manage_academy_course(course_id));
drop policy if exists academy_lessons_assigned_staff_all on public.academy_lessons;
create policy academy_lessons_assigned_staff_all on public.academy_lessons for all to authenticated
using (public.can_manage_academy_module(module_id)) with check (public.can_manage_academy_module(module_id));
drop policy if exists academy_assessments_assigned_staff_all on public.academy_assessments;
create policy academy_assessments_assigned_staff_all on public.academy_assessments for all to authenticated
using (public.can_manage_academy_module(module_id)) with check (public.can_manage_academy_module(module_id));
drop policy if exists academy_assessment_questions_assigned_staff_all on public.academy_assessment_questions;
create policy academy_assessment_questions_assigned_staff_all on public.academy_assessment_questions for all to authenticated
using (public.can_manage_academy_assessment(assessment_id)) with check (public.can_manage_academy_assessment(assessment_id));

drop policy if exists courses_assigned_staff_read on public.courses;
create policy courses_assigned_staff_read on public.courses for select to authenticated
using (public.can_manage_academy_course(id::text));
