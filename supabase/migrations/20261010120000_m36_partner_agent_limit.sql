-- M36: explicit organization representatives with a database-enforced active-agent cap.
create table if not exists public.partner_organization_agents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  full_name text not null check (length(full_name) between 2 and 220),
  job_title text not null check (length(job_title) between 2 and 160),
  business_email text not null default '' check (length(business_email) <= 254),
  authority_scope text[] not null default '{}' check (cardinality(authority_scope) <= 10),
  affiliation_document_id uuid references public.partner_identity_documents(id) on delete set null,
  status text not null default 'invited' check (status in ('invited','pending_verification','active','suspended','revoked')),
  invited_at timestamptz not null default now(),
  accepted_at timestamptz,
  verified_by uuid references auth.users(id) on delete set null,
  verified_at timestamptz,
  revoked_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (business_email = '' or business_email = lower(business_email)),
  check ((status = 'active' and user_id is not null and accepted_at is not null and verified_by is not null and verified_at is not null and revoked_at is null)
      or (status <> 'active' and (status <> 'revoked' or revoked_at is not null)))
);
create index if not exists partner_org_agents_org_status_idx
  on public.partner_organization_agents(organization_id, status, created_at);
create unique index if not exists partner_org_agents_active_user_unique
  on public.partner_organization_agents(organization_id, user_id)
  where user_id is not null and status in ('invited','pending_verification','active');

create or replace function public.enforce_partner_agent_limit()
returns trigger
language plpgsql
set search_path = public
as $function$
declare
  active_count integer;
begin
  perform pg_advisory_xact_lock(hashtextextended(new.organization_id::text, 360036));
  if new.status = 'active' then
    select count(*) into active_count
    from public.partner_organization_agents a
    where a.organization_id = new.organization_id
      and a.status = 'active'
      and a.id is distinct from new.id;
    if active_count >= 3 then
      raise exception 'PARTNER_AGENT_LIMIT_EXCEEDED' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$function$;
revoke all on function public.enforce_partner_agent_limit() from public;
drop trigger if exists partner_agent_limit_guard on public.partner_organization_agents;
create trigger partner_agent_limit_guard
before insert or update of organization_id, status on public.partner_organization_agents
for each row execute function public.enforce_partner_agent_limit();

alter table public.partner_organization_agents enable row level security;
drop policy if exists partner_org_agents_owner_select on public.partner_organization_agents;
create policy partner_org_agents_owner_select on public.partner_organization_agents
  for select to authenticated using (
    (select private.is_super_admin())
    or exists (
      select 1 from public.organization_members om
      where om.organization_id = partner_organization_agents.organization_id
        and om.user_id = (select auth.uid()) and om.status = 'active'
    )
  );
drop policy if exists partner_org_agents_admin_all on public.partner_organization_agents;
create policy partner_org_agents_admin_all on public.partner_organization_agents
  for all to authenticated using ((select private.is_super_admin()))
  with check ((select private.is_super_admin()));
grant select on public.partner_organization_agents to authenticated;
grant insert, update, delete on public.partner_organization_agents to authenticated;
