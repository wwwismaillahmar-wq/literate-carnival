-- M35: explicit course-scoped staff assignments for academy authoring.
create table if not exists public.academy_course_staff (
  id uuid primary key default gen_random_uuid(),
  course_id text not null check (length(course_id) between 1 and 120),
  user_id uuid not null references auth.users(id) on delete cascade,
  staff_role text not null check (staff_role in ('teacher','supervisor','course_manager')),
  status text not null default 'active' check (status in ('active','inactive')),
  assigned_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (course_id, user_id)
);
create index if not exists academy_course_staff_user_idx on public.academy_course_staff(user_id, status);
create index if not exists academy_course_staff_course_idx on public.academy_course_staff(course_id, status);
alter table public.academy_course_staff enable row level security;
drop policy if exists academy_course_staff_admin_all on public.academy_course_staff;
create policy academy_course_staff_admin_all on public.academy_course_staff
  for all to authenticated
  using (coalesce((select public.has_role('super_admin')), false))
  with check (coalesce((select public.has_role('super_admin')), false));
drop policy if exists academy_course_staff_read_self on public.academy_course_staff;
create policy academy_course_staff_read_self on public.academy_course_staff
  for select to authenticated using (user_id = auth.uid());
create or replace function public.can_manage_academy_course(p_course_id text)
returns boolean language sql stable security definer set search_path = public, pg_temp
as $$
  select coalesce(public.has_role('super_admin'), false)
    or exists (select 1 from public.academy_course_staff s
      where s.course_id = p_course_id and s.user_id = auth.uid()
      and s.status = 'active' and s.staff_role in ('teacher','supervisor','course_manager'));
$$;
revoke all on function public.can_manage_academy_course(text) from public, anon;
grant execute on function public.can_manage_academy_course(text) to authenticated;
grant select, insert, update, delete on public.academy_course_staff to authenticated;
