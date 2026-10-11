alter table public.academy_course_staff enable row level security;
drop policy if exists academy_course_staff_admin_all on public.academy_course_staff;
create policy academy_course_staff_admin_all on public.academy_course_staff for all to authenticated using (coalesce((select public.has_role('super_admin')), false)) with check (coalesce((select public.has_role('super_admin')), false));
drop policy if exists academy_course_staff_read_self on public.academy_course_staff;
create policy academy_course_staff_read_self on public.academy_course_staff for select to authenticated using (user_id = auth.uid());