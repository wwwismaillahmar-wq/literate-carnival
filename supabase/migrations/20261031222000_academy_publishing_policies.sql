-- Administrative publishing policies. Apply only to isolated staging after review.
create table if not exists public.academy_publishing_policies (
  policy_key text primary key check (policy_key ~ '^[a-z][a-z0-9_]{2,79}$'),
  description text not null default '',
  enabled boolean not null default false,
  enforcement text not null default 'warning' check (enforcement in ('required','warning')),
  exempt_roles text[] not null default array['super_admin']::text[],
  delegated_override_roles text[] not null default '{}'::text[],
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);
alter table public.academy_publishing_policies enable row level security;
revoke all on public.academy_publishing_policies from anon;
grant select,insert,update on public.academy_publishing_policies to authenticated;
drop policy if exists academy_publishing_policies_read on public.academy_publishing_policies;
create policy academy_publishing_policies_read on public.academy_publishing_policies
 for select to authenticated using (public.has_role('super_admin'));
drop policy if exists academy_publishing_policies_insert on public.academy_publishing_policies;
create policy academy_publishing_policies_insert on public.academy_publishing_policies
 for insert to authenticated with check (public.has_role('super_admin') and updated_by = auth.uid());
drop policy if exists academy_publishing_policies_update on public.academy_publishing_policies;
create policy academy_publishing_policies_update on public.academy_publishing_policies
 for update to authenticated using (public.has_role('super_admin'))
 with check (public.has_role('super_admin') and updated_by = auth.uid());
insert into public.academy_publishing_policies(policy_key,description,enabled,enforcement)
values
 ('require_minimum_lessons','اشتراط حد أدنى من الدروس',false,'warning'),
 ('require_quiz','اشتراط اختبار',false,'warning'),
 ('allow_partial_publish','السماح بالنشر الجزئي',true,'warning')
on conflict (policy_key) do nothing;
