-- Staging only. Lesson questions and replies; RLS always binds learner identity.
create table if not exists public.academy_lesson_questions (
 id uuid primary key default gen_random_uuid(),
 lesson_id uuid not null references public.academy_lessons(id) on delete cascade,
 student_id uuid not null references auth.users(id),
 body text not null check (length(btrim(body)) between 3 and 4000),
 answer text check (answer is null or length(btrim(answer)) between 1 and 4000),
 answered_by uuid references auth.users(id),
 answered_at timestamptz,
 created_at timestamptz not null default now()
);
create index if not exists academy_lesson_questions_lesson_idx on public.academy_lesson_questions(lesson_id,created_at desc);
create index if not exists academy_lesson_questions_student_idx on public.academy_lesson_questions(student_id,created_at desc);
alter table public.academy_lesson_questions enable row level security;
revoke all on public.academy_lesson_questions from anon,authenticated;
grant select,insert,update on public.academy_lesson_questions to authenticated;
create policy academy_questions_student_read on public.academy_lesson_questions for select to authenticated
using (student_id=(select auth.uid()) or exists (
 select 1 from public.academy_lessons l join public.academy_modules m on m.id=l.module_id
 where l.id=lesson_id and public.can_manage_academy_course(m.course_id)));
create policy academy_questions_student_insert on public.academy_lesson_questions for insert to authenticated
with check (student_id=(select auth.uid()) and answer is null and answered_by is null and answered_at is null and private.can_access_academy_lesson(lesson_id));
-- No direct UPDATE permission to students; use a guarded reply RPC for teaching staff.
revoke update on public.academy_lesson_questions from authenticated;
create or replace function public.answer_academy_lesson_question(p_question_id uuid,p_answer text)
returns jsonb language plpgsql security definer set search_path=''
as $fn$
declare q public.academy_lesson_questions%rowtype; cid text;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
 if length(btrim(coalesce(p_answer,''))) not between 1 and 4000 then raise exception 'INVALID_ANSWER'; end if;
 select * into q from public.academy_lesson_questions where id=p_question_id for update;
 if not found then raise exception 'QUESTION_NOT_FOUND'; end if;
 select m.course_id into cid from public.academy_lessons l join public.academy_modules m on m.id=l.module_id where l.id=q.lesson_id;
 if not coalesce(public.can_manage_academy_course(cid),false) then raise exception 'FORBIDDEN'; end if;
 update public.academy_lesson_questions set answer=btrim(p_answer),answered_by=auth.uid(),answered_at=now()
 where id=p_question_id returning * into q;
 return jsonb_build_object('id',q.id,'answer',q.answer,'answered_at',q.answered_at);
end;$fn$;
revoke all on function public.answer_academy_lesson_question(uuid,text) from public,anon;
grant execute on function public.answer_academy_lesson_question(uuid,text) to authenticated;
