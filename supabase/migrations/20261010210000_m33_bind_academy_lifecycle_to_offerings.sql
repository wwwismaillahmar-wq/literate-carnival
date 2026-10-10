-- M33/M34: bind admission screening, applications and learner enrollment to a school offering.
alter table public.academy_admission_questions
  add column if not exists offering_id uuid references public.academy_course_offerings(id) on delete set null;
alter table public.academy_admission_applications
  add column if not exists offering_id uuid references public.academy_course_offerings(id) on delete set null;
alter table public.academy_enrollments
  add column if not exists offering_id uuid references public.academy_course_offerings(id) on delete set null;

create index if not exists academy_admission_questions_offering_idx
  on public.academy_admission_questions(offering_id, active, sort_order);
create index if not exists academy_admission_applications_offering_status_idx
  on public.academy_admission_applications(offering_id, status, submitted_at desc);
create index if not exists academy_enrollments_offering_idx
  on public.academy_enrollments(offering_id, user_id, enrolled_at desc);

create or replace function private.validate_academy_offering_course_link()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_course_id text;
  v_offering_status text;
  v_school_status text;
  v_branch_status text;
begin
  if new.offering_id is null then
    return new;
  end if;

  select o.course_id::text, o.status, s.status, b.status
    into v_course_id, v_offering_status, v_school_status, v_branch_status
    from public.academy_course_offerings o
    join public.academy_schools s on s.id = o.school_id
    left join public.academy_branches b on b.id = o.branch_id and b.school_id = o.school_id
   where o.id = new.offering_id;

  if not found or v_course_id is distinct from new.course_id then
    raise exception 'OFFERING_COURSE_MISMATCH';
  end if;

  if tg_table_name = 'academy_admission_applications'
     and (v_offering_status <> 'published' or v_school_status <> 'active'
          or (new.offering_id is not null and exists (
            select 1 from public.academy_course_offerings o
            where o.id = new.offering_id and o.branch_id is not null
          ) and v_branch_status <> 'active')) then
    raise exception 'OFFERING_NOT_AVAILABLE';
  end if;

  return new;
end;
$function$;

revoke all on function private.validate_academy_offering_course_link() from public, anon, authenticated;

drop trigger if exists academy_admission_questions_offering_guard on public.academy_admission_questions;
create trigger academy_admission_questions_offering_guard
before insert or update of offering_id, course_id on public.academy_admission_questions
for each row execute function private.validate_academy_offering_course_link();

drop trigger if exists academy_admission_applications_offering_guard on public.academy_admission_applications;
create trigger academy_admission_applications_offering_guard
before insert or update of offering_id, course_id on public.academy_admission_applications
for each row execute function private.validate_academy_offering_course_link();

drop trigger if exists academy_enrollments_offering_guard on public.academy_enrollments;
create trigger academy_enrollments_offering_guard
before insert or update of offering_id, course_id on public.academy_enrollments
for each row execute function private.validate_academy_offering_course_link();

-- Public and owner/admin queries can now scope each lifecycle to a specific offering.
