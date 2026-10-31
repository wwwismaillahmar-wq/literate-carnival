create table if not exists public.admin_workspace_records (
 id uuid primary key default gen_random_uuid(),
 module text not null check (module in ('support','encyclopedias')),
 title text not null check (char_length(trim(title)) between 1 and 200),
 body text not null default '',
 status text not null default 'draft' check (status in ('draft','open','in_progress','resolved','published','archived')),
 created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists admin_workspace_records_module_idx on public.admin_workspace_records(module,created_at desc);
alter table public.admin_workspace_records enable row level security;
revoke all on public.admin_workspace_records from anon;
grant select,insert,update,delete on public.admin_workspace_records to authenticated;
drop policy if exists admin_workspace_records_super_admin on public.admin_workspace_records;
create policy admin_workspace_records_super_admin on public.admin_workspace_records
for all to authenticated using ((select private.is_super_admin()))
with check ((select private.is_super_admin()) and created_by=(select auth.uid()));
