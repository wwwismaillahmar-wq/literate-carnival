-- M04: centralized RBAC + organizations
-- Applied to the linked Supabase project as part of M04 implementation.
-- Keep this migration idempotent so production can safely replay schema setup.

create schema if not exists private;

create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  description text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint roles_key_format check (key ~ '^[a-z][a-z0-9_]*$')
);

create table if not exists public.permissions (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  description text not null default '',
  created_at timestamptz not null default now(),
  constraint permissions_key_format check (key ~ '^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$')
);

create table if not exists public.role_permissions (
  role_id uuid not null references public.roles(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (role_id, permission_id)
);

create table if not exists public.user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (user_id, role_id)
);

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  type text not null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organizations_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint organizations_type_check check (type in ('company','academy','partner','internal','community')),
  constraint organizations_status_check check (status in ('active','suspended','archived'))
);

create table if not exists public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete restrict,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (organization_id, user_id),
  constraint organization_members_status_check check (status in ('active','pending','suspended','removed'))
);

create index if not exists idx_user_roles_role_id on public.user_roles(role_id);
create index if not exists idx_org_members_user_id on public.organization_members(user_id);
create index if not exists idx_org_members_role_id on public.organization_members(role_id);
create index if not exists idx_role_permissions_permission_id on public.role_permissions(permission_id);
create index if not exists idx_roles_key on public.roles(key);
create index if not exists idx_permissions_key on public.permissions(key);

insert into public.roles(key,name,description) values
('super_admin','Super Admin','Full administrative control over the platform.'),
('management','Management','General management permissions.'),
('market_manager','Market Manager','Market and customer-facing management.'),
('services_manager','Services Manager','Service operations management.'),
('academy_manager','Academy Manager','Academy operations management.'),
('talent_manager','Talent Manager','Talent and contributor management.'),
('partner_manager','Partner Manager','Partner relationship management.'),
('finance','Finance','Finance-related access.'),
('instructor','Instructor','Instruction and training access.'),
('support','Support','Support operations access.'),
('customer','Customer','Standard customer/member access.'),
('student','Student','Student access.'),
('trainee','Trainee','Trainee access.'),
('partner','Partner','Partner access.'),
('company','Company','Company organization access.')
on conflict (key) do update set name=excluded.name,description=excluded.description,updated_at=now();

insert into public.permissions(key,name,description) values
('users.read','Read users','Read user directory and identity data permitted by policy.'),
('users.manage','Manage users','Manage user authorization assignments.'),
('profiles.read','Read profiles','Read profile information.'),
('profiles.manage','Manage profiles','Manage profile administration.'),
('posts.read','Read posts','Read posts permitted by content visibility.'),
('posts.create','Create posts','Create posts.'),
('posts.update','Update posts','Update posts subject to ownership/moderation rules.'),
('posts.delete','Delete posts','Delete posts subject to ownership/moderation rules.'),
('contributions.read','Read contributions','Read contributions permitted by visibility.'),
('contributions.create','Create contributions','Create contributions.'),
('contributions.update','Update contributions','Update contributions subject to ownership/moderation rules.'),
('contributions.delete','Delete contributions','Delete contributions subject to ownership/moderation rules.'),
('messages.read','Read messages','Read permitted conversations.'),
('messages.send','Send messages','Send permitted messages.'),
('organizations.read','Read organizations','Read organizations and memberships permitted by policy.'),
('organizations.manage','Manage organizations','Manage organizations and their memberships.'),
('settings.read','Read settings','Read application settings.'),
('settings.manage','Manage settings','Manage application settings.')
on conflict (key) do update set name=excluded.name,description=excluded.description;

insert into public.role_permissions(role_id,permission_id)
select r.id,p.id from public.roles r cross join public.permissions p
where r.key='super_admin'
on conflict do nothing;

insert into public.role_permissions(role_id,permission_id)
select r.id,p.id from public.roles r join public.permissions p on p.key in (
  'users.read','profiles.read','profiles.manage',
  'posts.read','posts.create','posts.update','posts.delete',
  'contributions.read','contributions.create','contributions.update','contributions.delete',
  'messages.read','messages.send','organizations.read','organizations.manage','settings.read'
) where r.key='management'
on conflict do nothing;

insert into public.role_permissions(role_id,permission_id)
select r.id,p.id from public.roles r join public.permissions p on p.key in (
  'profiles.read','posts.read','posts.create','contributions.read','contributions.create','messages.read','messages.send'
) where r.key in ('customer','student','trainee','partner','company')
on conflict do nothing;

insert into public.user_roles(user_id,role_id)
select p.id,r.id
from public.profiles p
join public.roles r on r.key=case when p.role='admin' then 'super_admin' else 'customer' end
on conflict do nothing;

create or replace function private.is_super_admin(target_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path=''
as $$ select exists (
  select 1 from public.user_roles ur join public.roles r on r.id=ur.role_id
  where ur.user_id=target_user and r.key='super_admin'
); $$;

create or replace function private.has_role(target_user uuid, role_key text, organization_id uuid default null)
returns boolean language sql stable security definer set search_path=''
as $$ select
  (select private.is_super_admin(target_user))
  or exists (
    select 1 from public.user_roles ur join public.roles r on r.id=ur.role_id
    where ur.user_id=target_user and r.key=role_key
  )
  or (
    organization_id is not null and exists (
      select 1 from public.organization_members om join public.roles r on r.id=om.role_id
      where om.organization_id=organization_id and om.user_id=target_user
        and om.status='active' and r.key=role_key
    )
  ); $$;

create or replace function private.is_super_admin_role(target_role uuid)
returns boolean language sql stable security definer set search_path=''
as $$ select exists (select 1 from public.roles where id=target_role and key='super_admin'); $$;

create or replace function private.has_permission(target_user uuid, permission_key text, organization_id uuid default null)
returns boolean language sql stable security definer set search_path=''
as $$ select
  (select private.is_super_admin(target_user))
  or exists (
    select 1 from public.user_roles ur
    join public.role_permissions rp on rp.role_id=ur.role_id
    join public.permissions p on p.id=rp.permission_id
    where ur.user_id=target_user and p.key=permission_key
  )
  or (
    organization_id is not null and exists (
      select 1 from public.organization_members om
      join public.role_permissions rp on rp.role_id=om.role_id
      join public.permissions p on p.id=rp.permission_id
      where om.organization_id=organization_id and om.user_id=target_user
        and om.status='active' and p.key=permission_key
    )
  ); $$;

create or replace function public.authorize(permission_key text, organization_id uuid default null)
returns boolean language sql stable security definer set search_path=''
as $$ select private.has_permission(auth.uid(),permission_key,organization_id); $$;

create or replace function public.has_role(role_key text, organization_id uuid default null)
returns boolean language sql stable security definer set search_path=''
as $$ select private.has_role(auth.uid(),role_key,organization_id); $$;

create or replace function public.authorization_context()
returns jsonb language sql stable security definer set search_path=''
as $$ select jsonb_build_object(
  'user_id',auth.uid(),
  'globalRoles',coalesce((select jsonb_agg(r.key order by r.key) from public.user_roles ur join public.roles r on r.id=ur.role_id where ur.user_id=auth.uid()),'[]'::jsonb),
  'permissions',coalesce((select jsonb_agg(distinct p.key order by p.key) from public.user_roles ur join public.role_permissions rp on rp.role_id=ur.role_id join public.permissions p on p.id=rp.permission_id where ur.user_id=auth.uid()),'[]'::jsonb),
  'organizations',coalesce((select jsonb_agg(jsonb_build_object('organizationId',om.organization_id,'role',r.key,'status',om.status) order by om.created_at) from public.organization_members om join public.roles r on r.id=om.role_id where om.user_id=auth.uid()),'[]'::jsonb)
); $$;

revoke all on function private.is_super_admin(uuid) from public,anon;
revoke all on function private.has_role(uuid,text,uuid) from public,anon;
revoke all on function private.has_permission(uuid,text,uuid) from public,anon;
revoke all on function private.is_super_admin_role(uuid) from public,anon;
grant usage on schema private to authenticated;
grant execute on function private.is_super_admin(uuid) to authenticated;
grant execute on function private.has_role(uuid,text,uuid) to authenticated;
grant execute on function private.has_permission(uuid,text,uuid) to authenticated;
grant execute on function private.is_super_admin_role(uuid) to authenticated;
revoke all on function public.authorize(text,uuid) from public,anon;
revoke all on function public.has_role(text,uuid) from public,anon;
revoke all on function public.authorization_context() from public,anon;
grant execute on function public.authorize(text,uuid) to authenticated;
grant execute on function public.has_role(text,uuid) to authenticated;
grant execute on function public.authorization_context() to authenticated;

alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.user_roles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;

drop policy if exists "m04 roles readable" on public.roles;
create policy "m04 roles readable" on public.roles for select to authenticated using (
  (select private.is_super_admin()) or exists (select 1 from public.user_roles ur where ur.user_id=auth.uid() and ur.role_id=roles.id)
);
drop policy if exists "m04 roles immutable" on public.roles;
create policy "m04 roles immutable" on public.roles for all to authenticated using (false) with check (false);

drop policy if exists "m04 permissions readable" on public.permissions;
create policy "m04 permissions readable" on public.permissions for select to authenticated using (
  (select private.is_super_admin()) or exists (
    select 1 from public.user_roles ur join public.role_permissions rp on rp.role_id=ur.role_id
    where ur.user_id=auth.uid() and rp.permission_id=permissions.id
  )
);
drop policy if exists "m04 permissions immutable" on public.permissions;
create policy "m04 permissions immutable" on public.permissions for all to authenticated using (false) with check (false);

drop policy if exists "m04 role permissions readable" on public.role_permissions;
create policy "m04 role permissions readable" on public.role_permissions for select to authenticated using (
  (select private.is_super_admin()) or exists (select 1 from public.user_roles ur where ur.user_id=auth.uid() and ur.role_id=role_permissions.role_id)
);
drop policy if exists "m04 role permissions immutable" on public.role_permissions;
create policy "m04 role permissions immutable" on public.role_permissions for all to authenticated using (false) with check (false);

drop policy if exists "m04 user roles readable" on public.user_roles;
create policy "m04 user roles readable" on public.user_roles for select to authenticated using (user_id=auth.uid() or (select private.is_super_admin()));
drop policy if exists "m04 user roles admin only" on public.user_roles;
create policy "m04 user roles admin only" on public.user_roles for insert to authenticated with check ((select private.is_super_admin()));
drop policy if exists "m04 user roles admin update" on public.user_roles;
create policy "m04 user roles admin update" on public.user_roles for update to authenticated using ((select private.is_super_admin())) with check ((select private.is_super_admin()));
drop policy if exists "m04 user roles admin delete" on public.user_roles;
create policy "m04 user roles admin delete" on public.user_roles for delete to authenticated using ((select private.is_super_admin()));

drop policy if exists "m04 organizations member read" on public.organizations;
create policy "m04 organizations member read" on public.organizations for select to authenticated using (
  (select private.is_super_admin()) or exists (
    select 1 from public.organization_members om
    where om.organization_id=organizations.id and om.user_id=auth.uid() and om.status in ('active','pending','suspended')
  )
);
drop policy if exists "m04 organizations create" on public.organizations;
create policy "m04 organizations create" on public.organizations for insert to authenticated with check ((select private.has_permission(auth.uid(),'organizations.manage')));
drop policy if exists "m04 organizations update" on public.organizations;
create policy "m04 organizations update" on public.organizations for update to authenticated using (
  (select private.is_super_admin()) or (select private.has_permission(auth.uid(),'organizations.manage',organizations.id))
) with check (
  (select private.is_super_admin()) or (select private.has_permission(auth.uid(),'organizations.manage',organizations.id))
);
drop policy if exists "m04 organizations delete" on public.organizations;
create policy "m04 organizations delete" on public.organizations for delete to authenticated using ((select private.is_super_admin()));

drop policy if exists "m04 memberships read" on public.organization_members;
create policy "m04 memberships read" on public.organization_members for select to authenticated using (
  user_id=auth.uid() or (select private.is_super_admin()) or (select private.has_permission(auth.uid(),'organizations.manage',organization_members.organization_id))
);
drop policy if exists "m04 memberships insert" on public.organization_members;
create policy "m04 memberships insert" on public.organization_members for insert to authenticated with check (
  (select private.is_super_admin())
  or (
    user_id <> auth.uid()
    and (select private.has_permission(auth.uid(),'organizations.manage',organization_members.organization_id))
    and not (select private.is_super_admin_role(organization_members.role_id))
  )
);
drop policy if exists "m04 memberships update" on public.organization_members;
create policy "m04 memberships update" on public.organization_members for update to authenticated using (
  (select private.is_super_admin()) or (select private.has_permission(auth.uid(),'organizations.manage',organization_members.organization_id))
) with check (
  (select private.is_super_admin())
  or (
    user_id <> auth.uid()
    and (select private.has_permission(auth.uid(),'organizations.manage',organization_members.organization_id))
    and role_id <> (select id from public.roles where key='super_admin')
  )
);
drop policy if exists "m04 memberships delete" on public.organization_members;
create policy "m04 memberships delete" on public.organization_members for delete to authenticated using (
  (select private.is_super_admin()) or (
    user_id <> auth.uid()
    and (select private.has_permission(auth.uid(),'organizations.manage',organization_members.organization_id))
  )
);
