-- Ensure RLS policies call the scoped helper instead of invoking the private super-admin helper directly.
drop policy if exists academy_schools_active_read_core on public.academy_schools;
create policy academy_schools_active_read_core on public.academy_schools
  for select to anon, authenticated using (
    status = 'active' or (select private.can_manage_academy_school(id, null))
  );
drop policy if exists academy_schools_admin_write_core on public.academy_schools;
create policy academy_schools_admin_write_core on public.academy_schools
  for all to authenticated using ((select private.can_manage_academy_school(id, null)))
  with check ((select private.can_manage_academy_school(id, null)));

drop policy if exists academy_branches_active_read_core on public.academy_branches;
create policy academy_branches_active_read_core on public.academy_branches
  for select to anon, authenticated using (
    (status = 'active' and exists (select 1 from public.academy_schools s where s.id = school_id and s.status = 'active'))
    or (select private.can_manage_academy_school(school_id, id))
  );
drop policy if exists academy_branches_admin_write_core on public.academy_branches;
create policy academy_branches_admin_write_core on public.academy_branches
  for all to authenticated using ((select private.can_manage_academy_school(school_id, id)))
  with check ((select private.can_manage_academy_school(school_id, id)));

drop policy if exists academy_memberships_owner_admin_read_core on public.academy_school_memberships;
create policy academy_memberships_owner_admin_read_core on public.academy_school_memberships
  for select to authenticated using (
    user_id = (select auth.uid())
    or (select private.can_manage_academy_school(school_id, branch_id))
  );
drop policy if exists academy_memberships_admin_write_core on public.academy_school_memberships;
create policy academy_memberships_admin_write_core on public.academy_school_memberships
  for all to authenticated using ((select private.can_manage_academy_school(school_id, branch_id)))
  with check (
    (select private.can_manage_academy_school(school_id, branch_id))
    and (role <> 'owner' or (select private.can_manage_academy_school(school_id, null)))
  );

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
    or (select private.can_manage_academy_school(school_id, branch_id))
  );
drop policy if exists academy_offerings_admin_write_core on public.academy_course_offerings;
create policy academy_offerings_admin_write_core on public.academy_course_offerings
  for all to authenticated using ((select private.can_manage_academy_school(school_id, branch_id)))
  with check ((select private.can_manage_academy_school(school_id, branch_id)));
