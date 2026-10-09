-- M38: assign leads and record every administrative status/assignment transition.
alter table public.leads
  add column if not exists assigned_to uuid references auth.users(id) on delete set null,
  add column if not exists updated_at timestamptz not null default now();
create index if not exists leads_assigned_status_idx
  on public.leads(assigned_to, status, created_at desc);

create table if not exists public.crm_lead_status_history (
  id uuid primary key default gen_random_uuid(),
  lead_id bigint not null references public.leads(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  previous_status text not null,
  new_status text not null check (new_status in ('new','contacted','qualified','closed')),
  previous_assignee uuid references auth.users(id) on delete set null,
  new_assignee uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists crm_lead_status_history_lead_idx
  on public.crm_lead_status_history(lead_id, created_at desc);
alter table public.crm_lead_status_history enable row level security;
drop policy if exists crm_lead_status_history_admin_read on public.crm_lead_status_history;
create policy crm_lead_status_history_admin_read on public.crm_lead_status_history
  for select to authenticated using ((select private.is_super_admin()));
grant select on public.crm_lead_status_history to authenticated;

create or replace function public.admin_update_crm_lead(
  p_lead_id bigint,
  p_status text,
  p_assigned_to uuid default null
)
returns table(id bigint, status text, assigned_to uuid, updated_at timestamptz)
language plpgsql
security definer
set search_path = public, private
as $function$
declare
  v_actor uuid := auth.uid();
  v_lead public.leads%rowtype;
begin
  if v_actor is null or not private.is_super_admin(v_actor) then raise exception 'FORBIDDEN'; end if;
  if p_status not in ('new','contacted','qualified','closed') then raise exception 'LEAD_STATUS_INVALID'; end if;
  if p_assigned_to is not null and not exists (select 1 from auth.users u where u.id = p_assigned_to) then
    raise exception 'LEAD_ASSIGNEE_NOT_FOUND';
  end if;
  select * into v_lead from public.leads where leads.id = p_lead_id for update;
  if not found then raise exception 'LEAD_NOT_FOUND'; end if;
  if v_lead.status is distinct from p_status or v_lead.assigned_to is distinct from p_assigned_to then
    insert into public.crm_lead_status_history(lead_id,actor_id,previous_status,new_status,previous_assignee,new_assignee)
    values(v_lead.id,v_actor,v_lead.status,p_status,v_lead.assigned_to,p_assigned_to);
    update public.leads set status=p_status, assigned_to=p_assigned_to, updated_at=now()
      where leads.id=p_lead_id;
  end if;
  return query select l.id,l.status,l.assigned_to,l.updated_at from public.leads l where l.id=p_lead_id;
end;
$function$;
revoke all on function public.admin_update_crm_lead(bigint,text,uuid) from public;
revoke execute on function public.admin_update_crm_lead(bigint,text,uuid) from anon;
grant execute on function public.admin_update_crm_lead(bigint,text,uuid) to authenticated;
