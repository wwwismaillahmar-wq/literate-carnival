-- Restricted account lookup for academy administrators.
create or replace function public.admin_search_accounts(search_text text)
returns table(id uuid, full_name text, username text, email text)
language sql stable security definer set search_path = ''
as $$
  select p.id, p.full_name, p.username, u.email::text
  from public.profiles p
  join auth.users u on u.id = p.id
  where auth.uid() is not null
    and private.is_super_admin(auth.uid())
    and length(trim(search_text)) between 2 and 80
    and (
      p.full_name ilike '%' || replace(replace(search_text, '%', '\%'), '_', '\_') || '%'
      or p.username ilike '%' || replace(replace(search_text, '%', '\%'), '_', '\_') || '%'
      or u.email ilike '%' || replace(replace(search_text, '%', '\%'), '_', '\_') || '%'
    )
  order by p.full_name nulls last
  limit 20;
$$;
revoke all on function public.admin_search_accounts(text) from public, anon;
grant execute on function public.admin_search_accounts(text) to authenticated;

-- Delegation nucleus: grants are per user and per permission.
create table if not exists public.admin_permission_grants (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references auth.users(id) on delete cascade,
  permission_key text not null check (permission_key ~ '^[a-z][a-z0-9_.]{2,100}$'),
  can_delegate boolean not null default false,
  granted_by uuid not null references auth.users(id),
  granted_at timestamptz not null default now(),
  expires_at timestamptz,
  unique (subject_id, permission_key)
);
create table if not exists public.admin_permission_audit (
  id bigint generated always as identity primary key,
  actor_id uuid not null references auth.users(id),
  subject_id uuid not null references auth.users(id),
  permission_key text not null,
  operation text not null check (operation in ('grant','revoke','update')),
  occurred_at timestamptz not null default now()
);
alter table public.admin_permission_grants enable row level security;
alter table public.admin_permission_audit enable row level security;
revoke all on public.admin_permission_grants, public.admin_permission_audit from anon;
grant select,insert,update,delete on public.admin_permission_grants to authenticated;
grant select on public.admin_permission_audit to authenticated;
create policy "admin_permission_grants_read" on public.admin_permission_grants for select to authenticated
  using (subject_id = auth.uid() or private.is_super_admin(auth.uid()));
create policy "admin_permission_grants_write" on public.admin_permission_grants for all to authenticated
  using (private.is_super_admin(auth.uid())) with check (private.is_super_admin(auth.uid()) and granted_by = auth.uid());
create policy "admin_permission_audit_read" on public.admin_permission_audit for select to authenticated
  using (private.is_super_admin(auth.uid()));
create or replace function public.admin_has_permission(required_permission text)
returns boolean language sql stable security definer set search_path = ''
as $$
  select auth.uid() is not null and (
    private.is_super_admin(auth.uid()) or exists (
      select 1 from public.admin_permission_grants g
      where g.subject_id = auth.uid()
        and g.permission_key = required_permission
        and (g.expires_at is null or g.expires_at > now())
    )
  );
$$;
revoke all on function public.admin_has_permission(text) from public, anon;
grant execute on function public.admin_has_permission(text) to authenticated;
create or replace function public.admin_grant_permission(target_id uuid, target_permission text, delegate_allowed boolean default false, expiry timestamptz default null)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null or not (
    private.is_super_admin(auth.uid()) or exists (
      select 1 from public.admin_permission_grants g
      where g.subject_id=auth.uid() and g.permission_key=target_permission
        and g.can_delegate and (g.expires_at is null or g.expires_at>now())
    )
  ) then raise exception 'permission denied' using errcode='42501'; end if;
  if target_permission !~ '^[a-z][a-z0-9_.]{2,100}$' then raise exception 'invalid permission'; end if;
  insert into public.admin_permission_grants(subject_id,permission_key,can_delegate,granted_by,expires_at)
  values(target_id,target_permission,delegate_allowed,auth.uid(),expiry)
  on conflict(subject_id,permission_key) do update set
    can_delegate=excluded.can_delegate, granted_by=excluded.granted_by,
    granted_at=now(),expires_at=excluded.expires_at;
  insert into public.admin_permission_audit(actor_id,subject_id,permission_key,operation)
  values(auth.uid(),target_id,target_permission,'grant');
end;
$$;
revoke all on function public.admin_grant_permission(uuid,text,boolean,timestamptz) from public,anon;
grant execute on function public.admin_grant_permission(uuid,text,boolean,timestamptz) to authenticated;
