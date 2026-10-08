-- Fix the zero-argument Super Admin helper used by admin RLS policies.
-- The existing one-argument helper is not interchangeable with private.is_super_admin().
create or replace function private.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public, private
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = auth.uid()
      and r.key = 'super_admin'
  );
$$;

revoke all on function private.is_super_admin() from public;
grant execute on function private.is_super_admin() to authenticated, service_role;
