-- M35: let assigned staff author only within their assigned course.
drop policy if exists academy_modules_assigned_staff_all on public.academy_modules;
create policy academy_modules_assigned_staff_all on public.academy_modules for all to authenticated
using (public.can_manage_academy_course(course_id))
with check (public.can_manage_academy_course(course_id));
drop policy if exists academy_lessons_assigned_staff_all on public.academy_lessons;
create policy academy_lessons_assigned_staff_all on public.academy_lessons for all to authenticated
using (exists (select 1 from public.academy_modules m where m.id = module_id and public.can_manage_academy_course(m.course_id)))
with check (exists (select 1 from public.academy_modules m where m.id = module_id and public.can_manage_academy_course(m.course_id)));
drop policy if exists academy_assessments_assigned_staff_all on public.academy_assessments;
create policy academy_assessments_assigned_staff_all on public.academy_assessments for all to authenticated
using (exists (select 1 from public.academy_modules m where m.id = module_id and public.can_manage_academy_course(m.course_id)))
with check (exists (select 1 from public.academy_modules m where m.id = module_id and public.can_manage_academy_course(m.course_id)));
drop policy if exists academy_assessment_questions_assigned_staff_all on public.academy_assessment_questions;
create policy academy_assessment_questions_assigned_staff_all on public.academy_assessment_questions for all to authenticated
using (exists (select 1 from public.academy_assessments a join public.academy_modules m on m.id = a.module_id where a.id = assessment_id and public.can_manage_academy_course(m.course_id)))
with check (exists (select 1 from public.academy_assessments a join public.academy_modules m on m.id = a.module_id where a.id = assessment_id and public.can_manage_academy_course(m.course_id)));