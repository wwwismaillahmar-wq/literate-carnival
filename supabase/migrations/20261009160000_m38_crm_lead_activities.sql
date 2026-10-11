create table if not exists public.crm_lead_activities (
  id uuid primary key default gen_random_uuid(),
  lead_id bigint not null references public.leads(id) on delete cascade,
  activity_type text not null check (activity_type in ('note','call','email','whatsapp','meeting','follow_up','status_change')),
  body text not null check (length(body) between 1 and 4000),
  follow_up_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists crm_lead_activities_lead_created_idx
  on public.crm_lead_activities(lead_id, created_at desc);

alter table public.crm_lead_activities enable row level security;
drop policy if exists crm_lead_activities_admin_all on public.crm_lead_activities;
create policy crm_lead_activities_admin_all on public.crm_lead_activities
  for all to authenticated using ((select private.is_super_admin()))
  with check ((select private.is_super_admin()));
grant select, insert, update, delete on public.crm_lead_activities to authenticated;
