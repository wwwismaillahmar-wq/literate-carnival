-- M34: secure published assessments and server-side grading.
create table if not exists public.academy_assessments (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.academy_modules(id) on delete cascade,
  title text not null check (length(title) between 2 and 180),
  pass_score integer not null default 70 check (pass_score between 1 and 100),
  max_attempts integer not null default 5 check (max_attempts between 1 and 10),
  status text not null default 'draft' check (status in ('draft','published','archived')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.academy_assessment_questions (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.academy_assessments(id) on delete cascade,
  prompt text not null check (length(prompt) between 2 and 2000),
  options jsonb not null check (jsonb_typeof(options) = 'array' and jsonb_array_length(options) between 2 and 8),
  correct_option text not null check (length(correct_option) between 1 and 80),
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now()
);
create index if not exists academy_assessment_questions_order_idx
  on public.academy_assessment_questions(assessment_id, sort_order);
create table if not exists public.academy_assessment_attempts (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.academy_assessments(id) on delete cascade,
  enrollment_id uuid not null references public.academy_enrollments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  attempt_number integer not null check (attempt_number between 1 and 10),
  answers jsonb not null check (jsonb_typeof(answers) = 'object'),
  score integer not null check (score between 0 and 100),
  passed boolean not null,
  submitted_at timestamptz not null default now(),
  unique(enrollment_id, assessment_id, attempt_number)
);
create index if not exists academy_assessment_attempts_user_idx
  on public.academy_assessment_attempts(user_id, submitted_at desc);

alter table public.academy_assessments enable row level security;
alter table public.academy_assessment_questions enable row level security;
alter table public.academy_assessment_attempts enable row level security;
drop policy if exists academy_assessments_admin_all on public.academy_assessments;
create policy academy_assessments_admin_all on public.academy_assessments
  for all to authenticated using ((select private.is_super_admin()))
  with check ((select private.is_super_admin()));
drop policy if exists academy_assessments_published_read on public.academy_assessments;
create policy academy_assessments_published_read on public.academy_assessments
  for select to anon, authenticated using (status = 'published' and exists (
    select 1 from public.academy_modules m where m.id = module_id and m.status = 'published'
  ));
drop policy if exists academy_questions_admin_all on public.academy_assessment_questions;
create policy academy_questions_admin_all on public.academy_assessment_questions
  for all to authenticated using ((select private.is_super_admin()))
  with check ((select private.is_super_admin()));
drop policy if exists academy_attempts_read_own on public.academy_assessment_attempts;
create policy academy_attempts_read_own on public.academy_assessment_attempts
  for select to authenticated using (user_id = (select auth.uid()) or (select private.is_super_admin()));
grant select, insert, update, delete on public.academy_assessments, public.academy_assessment_questions to authenticated;
grant select on public.academy_assessments to anon;
grant select on public.academy_assessment_attempts to authenticated;

create or replace function public.get_published_academy_assessment(p_assessment_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $function$
  select jsonb_build_object(
    'id', a.id, 'moduleId', a.module_id, 'title', a.title, 'passScore', a.pass_score,
    'questions', coalesce((
      select jsonb_agg(jsonb_build_object('id', q.id, 'prompt', q.prompt, 'options', q.options) order by q.sort_order, q.created_at)
      from public.academy_assessment_questions q where q.assessment_id = a.id
    ), '[]'::jsonb)
  )
  from public.academy_assessments a
  join public.academy_modules m on m.id = a.module_id and m.status = 'published'
  where a.id = p_assessment_id and a.status = 'published';
$function$;
revoke all on function public.get_published_academy_assessment(uuid) from public;
grant execute on function public.get_published_academy_assessment(uuid) to anon, authenticated;

create or replace function public.submit_academy_assessment(p_assessment_id uuid, p_answers jsonb)
returns table(attempt_id uuid, attempt_number integer, score integer, passed boolean, submitted_at timestamptz)
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_user uuid := auth.uid();
  v_assessment public.academy_assessments%rowtype;
  v_module public.academy_modules%rowtype;
  v_enrollment public.academy_enrollments%rowtype;
  v_total integer;
  v_correct integer;
  v_attempt integer;
  v_score integer;
  v_attempt_id uuid;
  v_submitted_at timestamptz := now();
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_answers is null or jsonb_typeof(p_answers) <> 'object' then raise exception 'ANSWERS_INVALID'; end if;
  select * into v_assessment from public.academy_assessments
    where id = p_assessment_id and status = 'published' for update;
  if not found then raise exception 'ASSESSMENT_NOT_FOUND'; end if;
  select * into v_module from public.academy_modules where id = v_assessment.module_id and status = 'published';
  if not found then raise exception 'MODULE_NOT_PUBLISHED'; end if;
  select * into v_enrollment from public.academy_enrollments
    where user_id = v_user and course_id = v_module.course_id and status = 'enrolled'
    for update;
  if not found then raise exception 'ENROLLMENT_REQUIRED'; end if;

  select count(*) into v_total from public.academy_assessment_questions where assessment_id = v_assessment.id;
  if v_total < 1 or jsonb_object_length(p_answers) <> v_total then raise exception 'ANSWERS_INCOMPLETE'; end if;
  if exists (
    select 1 from jsonb_each(p_answers) answer
    where not exists (
      select 1 from public.academy_assessment_questions q
      where q.assessment_id = v_assessment.id
        and q.id::text = answer.key
        and answer.value #>> '{}' is not null
        and q.options @> jsonb_build_array(jsonb_build_object('key', answer.value #>> '{}'))
    )
  ) then raise exception 'ANSWER_OPTION_INVALID'; end if;

  select count(*) into v_correct
  from public.academy_assessment_questions q
  join jsonb_each_text(p_answers) answer on answer.key = q.id::text
  where q.assessment_id = v_assessment.id and answer.value = q.correct_option;

  select coalesce(max(attempt_number),0)+1 into v_attempt
  from public.academy_assessment_attempts
  where enrollment_id = v_enrollment.id and assessment_id = v_assessment.id;
  if v_attempt > v_assessment.max_attempts then raise exception 'ATTEMPT_LIMIT_REACHED'; end if;
  v_score := round((100.0 * v_correct) / v_total)::integer;

  insert into public.academy_assessment_attempts(assessment_id,enrollment_id,user_id,attempt_number,answers,score,passed,submitted_at)
  values(v_assessment.id,v_enrollment.id,v_user,v_attempt,p_answers,v_score,v_score >= v_assessment.pass_score,v_submitted_at)
  returning id into v_attempt_id;
  return query select v_attempt_id,v_attempt,v_score,v_score >= v_assessment.pass_score,v_submitted_at;
end;
$function$;
revoke all on function public.submit_academy_assessment(uuid, jsonb) from public;
revoke execute on function public.submit_academy_assessment(uuid, jsonb) from anon;
grant execute on function public.submit_academy_assessment(uuid, jsonb) to authenticated;
