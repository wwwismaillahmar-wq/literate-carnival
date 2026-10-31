-- Dynamic authorisation for course management and delegated administration.
create or replace function public.check_permission(user_id uuid, required_permission text)
returns boolean language sql stable security definer set search_path = ''
as $$
 select user_id is not null and user_id = auth.uid() and (
   private.is_super_admin(user_id) or exists (
     select 1 from public.admin_permission_grants g
     where g.subject_id=user_id and g.permission_key=required_permission
       and (g.expires_at is null or g.expires_at>now())
   )
 );
$$;
revoke all on function public.check_permission(uuid,text) from public,anon;
grant execute on function public.check_permission(uuid,text) to authenticated;
-- Course managers may manage course inventory; publishers may change publication state.
create policy courses_delegated_read on public.courses for select to authenticated
 using (public.check_permission(auth.uid(),'academy.manage') or public.check_permission(auth.uid(),'academy.publish'));
create policy courses_delegated_insert on public.courses for insert to authenticated
 with check (public.check_permission(auth.uid(),'academy.manage'));
create policy courses_delegated_update on public.courses for update to authenticated
 using (public.check_permission(auth.uid(),'academy.manage') or public.check_permission(auth.uid(),'academy.publish'))
 with check (public.check_permission(auth.uid(),'academy.manage') or public.check_permission(auth.uid(),'academy.publish'));
create policy courses_delegated_delete on public.courses for delete to authenticated
 using (public.check_permission(auth.uid(),'academy.manage'));
create policy academy_modules_delegated_all on public.academy_modules for all to authenticated
 using (public.check_permission(auth.uid(),'academy.manage'))
 with check (public.check_permission(auth.uid(),'academy.manage'));
create policy academy_lessons_delegated_all on public.academy_lessons for all to authenticated
 using (public.check_permission(auth.uid(),'academy.manage'))
 with check (public.check_permission(auth.uid(),'academy.manage'));
-- Grant changes must pass through audited RPC, never direct Data API mutations.
drop policy if exists admin_permission_grants_write on public.admin_permission_grants;
revoke insert,update,delete on public.admin_permission_grants from authenticated;
create policy admin_permission_grants_delegator_read on public.admin_permission_grants
 for select to authenticated using (
   exists (select 1 from public.admin_permission_grants g
    where g.subject_id=auth.uid() and g.permission_key=admin_permission_grants.permission_key
      and g.can_delegate and (g.expires_at is null or g.expires_at>now()))
 );
create policy admin_permission_audit_delegated_read on public.admin_permission_audit
 for select to authenticated using (public.check_permission(auth.uid(),'admin.delegate'));
-- Access to supporting workspace records for delegated administrators.
create policy admin_workspace_records_delegated on public.admin_workspace_records for all to authenticated
 using (public.check_permission(auth.uid(),'support.manage') or public.check_permission(auth.uid(),'encyclopedias.manage'))
 with check (created_by=auth.uid() and (public.check_permission(auth.uid(),'support.manage') or public.check_permission(auth.uid(),'encyclopedias.manage')));
