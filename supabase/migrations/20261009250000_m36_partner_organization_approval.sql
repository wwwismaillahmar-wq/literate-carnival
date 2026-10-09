-- M36: convert approved partner applications into scoped organizations using existing M04 tables.
alter table public.partner_applications
  add column if not exists organization_id uuid references public.organizations(id) on delete set null;
create unique index if not exists partner_applications_organization_unique
  on public.partner_applications(organization_id) where organization_id is not null;

create or replace function public.create_partner_organization_on_approval()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $function$
declare
  v_slug_base text;
  v_slug text;
  v_suffix integer := 1;
  v_org_id uuid;
  v_partner_role uuid;
begin
  if new.status = 'approved'
     and old.status is distinct from 'approved'
     and new.owner_id is not null
     and new.organization_id is null then
    v_slug_base := trim(both '-' from regexp_replace(lower(new.organization_name), '[^a-z0-9]+', '-', 'g'));
    if v_slug_base = '' then v_slug_base := 'partner'; end if;
    v_slug := left(v_slug_base, 70);
    while exists (select 1 from public.organizations o where o.slug = v_slug) loop
      v_slug := left(v_slug_base, 60) || '-' || v_suffix::text;
      v_suffix := v_suffix + 1;
    end loop;

    insert into public.organizations(name, slug, type, status)
    values(new.organization_name, v_slug, 'partner', 'active')
    returning id into v_org_id;

    select id into v_partner_role from public.roles where key = 'partner';
    if v_partner_role is null then raise exception 'PARTNER_ROLE_NOT_FOUND'; end if;

    insert into public.organization_members(organization_id, user_id, role_id, status)
    values(v_org_id, new.owner_id, v_partner_role, 'active')
    on conflict (organization_id, user_id) do update set status = 'active', role_id = excluded.role_id, updated_at = now();

    new.organization_id := v_org_id;
    new.updated_at := now();
  end if;
  return new;
end;
$function$;
revoke all on function public.create_partner_organization_on_approval() from public;
drop trigger if exists partner_application_approved_organization on public.partner_applications;
create trigger partner_application_approved_organization
before update of status on public.partner_applications
for each row execute function public.create_partner_organization_on_approval();
