drop policy if exists admin_permission_grants_delegator_read on public.admin_permission_grants;
create or replace function private.can_delegate_permission(permission_name text)
returns boolean language sql stable security definer set search_path = ''
as $$
 select private.is_super_admin(auth.uid()) or exists (
   select 1 from public.admin_permission_grants g
   where g.subject_id=auth.uid() and g.permission_key=permission_name
     and g.can_delegate and (g.expires_at is null or g.expires_at>now())
 );
$$;
create policy admin_permission_grants_delegator_read on public.admin_permission_grants
 for select to authenticated using (private.can_delegate_permission(permission_key));