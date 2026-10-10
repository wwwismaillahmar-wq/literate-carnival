-- M34 security closure: enrollment must pass the server/database payment and admission gate.
-- Direct authenticated INSERT allowed learners to forge an enrolled row without a paid admission.
drop policy if exists academy_enrollments_insert_own on public.academy_enrollments;
revoke insert on public.academy_enrollments from anon, authenticated;

create or replace function public.enroll_academy_learner(
  p_course_id text,
  p_offering_id uuid default null
)
returns table(
  enrollment_id uuid,
  course_id text,
  offering_id uuid,
  status text,
  enrolled_at timestamptz,
  completed_at timestamptz,
  already_enrolled boolean
)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user uuid := auth.uid();
  v_enrollment public.academy_enrollments%rowtype;
  v_course_published boolean := false;
  v_offering_course text;
  v_offering_status text;
  v_offering_branch uuid;
  v_school_status text;
  v_branch_status text;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_course_id is null or length(trim(p_course_id)) < 1 or length(p_course_id) > 120 then
    raise exception 'INVALID_COURSE_ID';
  end if;

  select e.* into v_enrollment
  from public.academy_enrollments e
  where e.user_id = v_user and e.course_id = p_course_id
  for update;
  if found then
    if v_enrollment.offering_id is distinct from p_offering_id then
      raise exception 'ENROLLMENT_OFFERING_MISMATCH';
    end if;
    return query select v_enrollment.id, v_enrollment.course_id, v_enrollment.offering_id,
      v_enrollment.status, v_enrollment.enrolled_at, v_enrollment.completed_at, true;
    return;
  end if;

  select coalesce(
    to_jsonb(c)->>'published' = 'true',
    to_jsonb(c)->>'is_published' = 'true',
    to_jsonb(c)->>'is_active' = 'true',
    to_jsonb(c)->>'active' = 'true',
    to_jsonb(c)->>'visibility' in ('published','public'),
    to_jsonb(c)->>'status' in ('published','active','public'),
    false
  ) into v_course_published
  from public.courses c
  where c.id::text = p_course_id;
  if not found or not v_course_published then raise exception 'COURSE_NOT_AVAILABLE'; end if;

  if p_offering_id is not null then
    select o.course_id::text, o.status, o.branch_id, s.status, b.status
      into v_offering_course, v_offering_status, v_offering_branch, v_school_status, v_branch_status
      from public.academy_course_offerings o
      join public.academy_schools s on s.id = o.school_id
      left join public.academy_branches b on b.id = o.branch_id and b.school_id = o.school_id
     where o.id = p_offering_id;
    if not found or v_offering_course is distinct from p_course_id then
      raise exception 'OFFERING_COURSE_MISMATCH';
    end if;
    if v_offering_status <> 'published' or v_school_status <> 'active'
       or (v_offering_branch is not null and v_branch_status <> 'active') then
      raise exception 'OFFERING_NOT_AVAILABLE';
    end if;
  elsif exists (
    select 1
    from public.academy_course_offerings o
    join public.academy_schools s on s.id = o.school_id and s.status = 'active'
    left join public.academy_branches b on b.id = o.branch_id and b.school_id = o.school_id
    where o.course_id::text = p_course_id
      and o.status = 'published'
      and (o.branch_id is null or b.status = 'active')
  ) then
    raise exception 'OFFERING_REQUIRED';
  end if;

  if not exists (
    select 1 from public.academy_admission_applications a
    where a.user_id = v_user
      and a.course_id = p_course_id
      and a.offering_id is not distinct from p_offering_id
      and a.status in ('paid','enrolled')
  ) then
    raise exception 'PAID_ADMISSION_REQUIRED';
  end if;

  insert into public.academy_enrollments(user_id, course_id, offering_id, status, completed_at)
  values (v_user, p_course_id, p_offering_id, 'enrolled', null)
  on conflict (user_id, course_id) do nothing
  returning * into v_enrollment;

  if not found then
    select e.* into v_enrollment
    from public.academy_enrollments e
    where e.user_id = v_user and e.course_id = p_course_id;
    if v_enrollment.offering_id is distinct from p_offering_id then
      raise exception 'ENROLLMENT_OFFERING_MISMATCH';
    end if;
    return query select v_enrollment.id, v_enrollment.course_id, v_enrollment.offering_id,
      v_enrollment.status, v_enrollment.enrolled_at, v_enrollment.completed_at, true;
    return;
  end if;

  return query select v_enrollment.id, v_enrollment.course_id, v_enrollment.offering_id,
    v_enrollment.status, v_enrollment.enrolled_at, v_enrollment.completed_at, false;
end;
$function$;

revoke all on function public.enroll_academy_learner(text,uuid) from public, anon;
grant execute on function public.enroll_academy_learner(text,uuid) to authenticated;
