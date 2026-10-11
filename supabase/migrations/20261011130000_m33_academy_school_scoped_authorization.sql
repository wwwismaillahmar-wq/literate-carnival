-- Scope school/branch administration to active school memberships.
create or replace function private.can_manage_academy_school(p_school_id uuid, p_branch_id uuid default null)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select coalesce(private.is_super_admin(), false)
      or exists (
        select 1
        from public.academy_school_memberships m
        where m.school_id = p_school_id
          and m.user_id = auth.uid()
          and m.status = 'active'
          and m.role in ('owner','admin')
          and (m.branch_id is null or m.branch_id = p_branch_id)
      );
$function$;
revoke all on function private.can_manage_academy_school(uuid,uuid) from public;
grant execute on function private.can_manage_academy_school(uuid,uuid) to anon, authenticated;

drop policy if exists academy_schools_public_read on public.academy_schools;
create policy academy_schools_public_read on public.academy_schools
  for select to anon, authenticated using (
    status = 'active' or (select private.can_manage_academy_school(id, null))
  );
drop policy if exists academy_schools_manager_write on public.academy_schools;
create policy academy_schools_manager_write on public.academy_schools
  for all to authenticated using ((select private.can_manage_academy_school(id, null)))
  with check ((select private.can_manage_academy_school(id, null)));

drop policy if exists academy_branches_public_read on public.academy_branches;
create policy academy_branches_public_read on public.academy_branches
  for select to anon, authenticated using (
    (status = 'active' and exists (
      select 1 from public.academy_schools s where s.id = school_id and s.status = 'active'
    )) or (select private.can_manage_academy_school(school_id, id))
  );
drop policy if exists academy_branches_manager_write on public.academy_branches;
create policy academy_branches_manager_write on public.academy_branches
  for all to authenticated using ((select private.can_manage_academy_school(school_id, id)))
  with check ((select private.can_manage_academy_school(school_id, id)));

drop policy if exists academy_school_memberships_scope_read on public.academy_school_memberships;
create policy academy_school_memberships_scope_read on public.academy_school_memberships
  for select to authenticated using (
    user_id = (select auth.uid())
    or (select private.can_manage_academy_school(school_id, branch_id))
  );
drop policy if exists academy_school_memberships_manager_write on public.academy_school_memberships;
create policy academy_school_memberships_manager_write on public.academy_school_memberships
  for all to authenticated using ((select private.can_manage_academy_school(school_id, branch_id)))
  with check (
    (select private.can_manage_academy_school(school_id, branch_id))
    and (role <> 'owner' or (select private.is_super_admin()))
  );

drop policy if exists academy_course_offerings_public_read on public.academy_course_offerings;
create policy academy_course_offerings_public_read on public.academy_course_offerings
  for select to anon, authenticated using (
    status = 'published'
    and exists (select 1 from public.academy_schools s where s.id = school_id and s.status = 'active')
    and (branch_id is null or exists (
      select 1 from public.academy_branches b
      where b.id = academy_course_offerings.branch_id
        and b.school_id = academy_course_offerings.school_id and b.status = 'active'
    ))
  );
drop policy if exists academy_course_offerings_manager_write on public.academy_course_offerings;
create policy academy_course_offerings_manager_write on public.academy_course_offerings
  for all to authenticated using ((select private.can_manage_academy_school(school_id, branch_id)))
  with check ((select private.can_manage_academy_school(school_id, branch_id)));
