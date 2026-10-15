-- Private course content, staff publication review and atomic admission invoices.
alter table public.invoices add column if not exists updated_at timestamptz not null default now();
alter table public.invoices drop constraint if exists invoices_source_type_check;
alter table public.invoices add constraint invoices_source_type_check check(source_type in ('order','service_request','academy','academy_admission','other'));
create unique index if not exists invoices_academy_admission_source_unique on public.invoices(source_id) where source_type='academy_admission';
create or replace function public.issue_academy_admission_invoice(p_application_id uuid)
returns jsonb language plpgsql security definer set search_path=''
as $fn$
declare v_application public.academy_admission_applications%rowtype; v_invoice public.invoices%rowtype; v_price numeric;
begin
 if auth.uid() is null or not coalesce(private.is_super_admin(),false) then raise exception 'FORBIDDEN'; end if;
 select * into v_application from public.academy_admission_applications where id=p_application_id for update;
 if not found then raise exception 'ADMISSION_NOT_FOUND'; end if;
 if v_application.user_id is null then raise exception 'ADMISSION_ACCOUNT_REQUIRED'; end if;
 if v_application.status not in ('accepted','payment_pending','paid','enrolled') then raise exception 'ADMISSION_NOT_ACCEPTED'; end if;
 select * into v_invoice from public.invoices where source_type='academy_admission' and source_id=v_application.id::text for update;
 if found then
  if v_invoice.customer_id is distinct from v_application.user_id or v_invoice.status='void' then raise exception 'ADMISSION_INVOICE_MISMATCH'; end if;
 else
  if v_application.status not in ('accepted','payment_pending') then raise exception 'ADMISSION_INVOICE_MISSING'; end if;
  select c.price_dzd into v_price from public.courses c where c.id::text=v_application.course_id for share;
  if v_price is null or v_price<=0 then raise exception 'COURSE_PRICE_REQUIRED'; end if;
  insert into public.invoices(invoice_number,customer_id,source_type,source_id,currency,subtotal,tax_amount,total_amount,status)
  values('ASL-ACAD-'||replace(v_application.id::text,'-',''),v_application.user_id,'academy_admission',v_application.id::text,'DZD',v_price,0,v_price,'issued') returning * into v_invoice;
 end if;
 if v_application.status='accepted' then
  update public.academy_admission_applications set status='payment_pending',reviewer_id=auth.uid(),reviewed_at=now(),updated_at=now() where id=v_application.id;
 end if;
 return jsonb_build_object('id',v_invoice.id,'invoice_number',v_invoice.invoice_number,'total_amount',v_invoice.total_amount,'currency',v_invoice.currency,'status',v_invoice.status);
end;
$fn$;
revoke all on function public.issue_academy_admission_invoice(uuid) from public,anon;
grant execute on function public.issue_academy_admission_invoice(uuid) to authenticated;
alter table public.courses add column if not exists lesson_release_mode text not null default 'sequential' check(lesson_release_mode in ('sequential','open'));

create or replace function private.can_access_academy_lesson(p_lesson_id uuid)
returns boolean language sql stable security definer set search_path=''
as $fn$
 select auth.uid() is not null and exists(
 select 1 from public.academy_lessons l join public.academy_modules m on m.id=l.module_id join public.courses c on c.id::text=m.course_id
 where l.id=p_lesson_id and (public.can_manage_academy_course(m.course_id) or (
 l.status='published' and m.status='published' and c.status='published' and exists(
 select 1 from public.academy_enrollments e where e.user_id=auth.uid() and e.course_id=m.course_id and e.status in ('enrolled','completed')
 and (c.lesson_release_mode='open' or not exists(
 select 1 from public.academy_lessons prior join public.academy_modules pm on pm.id=prior.module_id
 where pm.course_id=m.course_id and prior.status='published' and pm.status='published'
 and (pm.sort_order,pm.created_at,pm.id,prior.sort_order,prior.created_at,prior.id)<(m.sort_order,m.created_at,m.id,l.sort_order,l.created_at,l.id)
 and not exists(select 1 from public.academy_lesson_progress p where p.enrollment_id=e.id and p.lesson_id=prior.id and p.completed)
 ))))));
$fn$;
revoke all on function private.can_access_academy_lesson(uuid) from public;
grant execute on function private.can_access_academy_lesson(uuid) to anon,authenticated;
drop policy if exists academy_lessons_published_read on public.academy_lessons;
create policy academy_lessons_published_read on public.academy_lessons for select to anon,authenticated using(private.can_access_academy_lesson(id));
create or replace function public.academy_curriculum(p_course_id text)
returns jsonb language sql stable security definer set search_path=''
as $fn$
 select coalesce(jsonb_agg(jsonb_build_object('id',l.id,'module_id',l.module_id,'title',l.title,'lesson_type',l.lesson_type,'duration_minutes',l.duration_minutes,'sort_order',l.sort_order,'accessible',private.can_access_academy_lesson(l.id))
 order by m.sort_order,m.created_at,m.id,l.sort_order,l.created_at,l.id),'[]'::jsonb)
 from public.academy_lessons l join public.academy_modules m on m.id=l.module_id join public.courses c on c.id::text=m.course_id
 where m.course_id=p_course_id and l.status='published' and m.status='published' and c.status='published';
$fn$;
revoke all on function public.academy_curriculum(text) from public;
grant execute on function public.academy_curriculum(text) to anon,authenticated;
create or replace function private.enforce_academy_progress_access()
returns trigger language plpgsql security definer set search_path=''
as $fn$
begin
 if auth.uid() is null or new.user_id is distinct from auth.uid() or not private.can_access_academy_lesson(new.lesson_id) then raise exception 'LESSON_ACCESS_REQUIRED'; end if;
 if tg_op='UPDATE' and (new.enrollment_id is distinct from old.enrollment_id or new.lesson_id is distinct from old.lesson_id or new.user_id is distinct from old.user_id) then raise exception 'PROGRESS_IDENTITY_IMMUTABLE'; end if;
 return new;
end;
$fn$;
revoke all on function private.enforce_academy_progress_access() from public,anon,authenticated;
create trigger academy_progress_access_gate before insert or update on public.academy_lesson_progress for each row execute function private.enforce_academy_progress_access();
create or replace function private.can_publish_academy_course(p_course_id text)
returns boolean language sql stable security definer set search_path=''
as $fn$
 select auth.uid() is not null and (coalesce(private.is_super_admin(),false) or exists(
 select 1 from public.academy_course_staff s where s.course_id=p_course_id and s.user_id=auth.uid() and s.status='active' and s.staff_role in ('supervisor','course_manager')));
$fn$;
revoke all on function private.can_publish_academy_course(text) from public,anon;
grant execute on function private.can_publish_academy_course(text) to authenticated;

create table public.academy_lesson_assets(
 id uuid primary key default gen_random_uuid(),lesson_id uuid not null references public.academy_lessons(id) on delete cascade,
 owner_id uuid not null references auth.users(id) on delete restrict,object_path text not null unique,
 file_name text not null check(length(file_name) between 1 and 180),
 mime_type text not null check(mime_type in ('video/mp4','video/webm','application/pdf','application/vnd.openxmlformats-officedocument.presentationml.presentation','application/vnd.openxmlformats-officedocument.wordprocessingml.document','image/jpeg','image/png','image/webp','text/plain')),
 file_size bigint not null check(file_size between 1 and 52428800),
 status text not null default 'pending' check(status in ('pending','ready','archived')),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 check(object_path=lesson_id::text||'/'||id::text));
create index academy_lesson_assets_lesson_idx on public.academy_lesson_assets(lesson_id,status);
create index academy_lesson_assets_owner_idx on public.academy_lesson_assets(owner_id);
alter table public.academy_lesson_assets enable row level security;
create policy academy_lesson_assets_staff on public.academy_lesson_assets for all to authenticated
 using(public.can_manage_academy_module((select l.module_id from public.academy_lessons l where l.id=lesson_id)))
 with check(public.can_manage_academy_module((select l.module_id from public.academy_lessons l where l.id=lesson_id)));
create policy academy_lesson_assets_learner_read on public.academy_lesson_assets for select to authenticated using(status='ready' and private.can_access_academy_lesson(lesson_id));
grant select,insert,update,delete on public.academy_lesson_assets to authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('aslan-academy','aslan-academy',false,52428800,array['video/mp4','video/webm','application/pdf','application/vnd.openxmlformats-officedocument.presentationml.presentation','application/vnd.openxmlformats-officedocument.wordprocessingml.document','image/jpeg','image/png','image/webp','text/plain'])
 on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
create policy academy_storage_staff_insert on storage.objects for insert to authenticated with check(
 bucket_id='aslan-academy' and exists(select 1 from public.academy_lesson_assets a join public.academy_lessons l on l.id=a.lesson_id
 where a.object_path=name and a.status='pending' and a.owner_id=auth.uid() and public.can_manage_academy_module(l.module_id)));
create policy academy_storage_authorized_read on storage.objects for select to authenticated using(
 bucket_id='aslan-academy' and exists(select 1 from public.academy_lesson_assets a join public.academy_lessons l on l.id=a.lesson_id
 where a.object_path=name and (public.can_manage_academy_module(l.module_id) or (a.status='ready' and private.can_access_academy_lesson(a.lesson_id)))));
create policy academy_storage_staff_delete on storage.objects for delete to authenticated using(
 bucket_id='aslan-academy' and exists(select 1 from public.academy_lesson_assets a join public.academy_lessons l on l.id=a.lesson_id
 where a.object_path=name and public.can_manage_academy_module(l.module_id)
 and (l.status<>'published' or private.can_publish_academy_course((select m.course_id from public.academy_modules m where m.id=l.module_id)))));

create or replace function private.can_take_academy_assessment(p_assessment_id uuid)
returns boolean language sql stable security definer set search_path=''
as $fn$
 select auth.uid() is not null and exists(
 select 1 from public.academy_assessments a join public.academy_modules m on m.id=a.module_id join public.courses c on c.id::text=m.course_id
 join public.academy_enrollments e on e.course_id=m.course_id and e.user_id=auth.uid()
 where a.id=p_assessment_id and a.status='published' and m.status='published' and c.status='published' and e.status='enrolled'
 and not exists(select 1 from public.academy_lessons l where l.module_id=m.id and l.status='published'
 and not exists(select 1 from public.academy_lesson_progress p where p.enrollment_id=e.id and p.lesson_id=l.id and p.completed)));
$fn$;
revoke all on function private.can_take_academy_assessment(uuid) from public;
grant execute on function private.can_take_academy_assessment(uuid) to authenticated;
create or replace function public.get_published_academy_assessment(p_assessment_id uuid)
returns jsonb language sql stable security definer set search_path=''
as $fn$
 select jsonb_build_object('id',a.id,'moduleId',a.module_id,'title',a.title,'passScore',a.pass_score,'questions',
 coalesce((select jsonb_agg(jsonb_build_object('id',q.id,'prompt',q.prompt,'options',q.options) order by q.sort_order,q.created_at,q.id)
 from public.academy_assessment_questions q where q.assessment_id=a.id),'[]'::jsonb))
 from public.academy_assessments a where a.id=p_assessment_id and private.can_take_academy_assessment(a.id);
$fn$;
revoke all on function public.get_published_academy_assessment(uuid) from public,anon;
grant execute on function public.get_published_academy_assessment(uuid) to authenticated;
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

  if not private.can_take_academy_assessment(v_assessment.id) then raise exception 'MODULE_COMPLETION_REQUIRED'; end if;
  select count(*) into v_total from public.academy_assessment_questions where assessment_id = v_assessment.id;
  if v_total < 1 or (select count(*) from jsonb_object_keys(p_answers)) <> v_total then raise exception 'ANSWERS_INCOMPLETE'; end if;
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

  select coalesce(max(att.attempt_number),0)+1 into v_attempt
  from public.academy_assessment_attempts att
  where att.enrollment_id = v_enrollment.id and att.assessment_id = v_assessment.id;
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

alter table public.academy_modules drop constraint if exists academy_modules_status_check;
alter table public.academy_modules add constraint academy_modules_status_check check(status in ('draft','review','published','archived'));
alter table public.academy_lessons drop constraint if exists academy_lessons_status_check;
alter table public.academy_lessons add constraint academy_lessons_status_check check(status in ('draft','review','published','archived'));
alter table public.academy_assessments drop constraint if exists academy_assessments_status_check;
alter table public.academy_assessments add constraint academy_assessments_status_check check(status in ('draft','review','published','archived'));
alter table public.academy_modules add column reviewed_by uuid references auth.users(id) on delete set null,add column reviewed_at timestamptz;
alter table public.academy_lessons add column reviewed_by uuid references auth.users(id) on delete set null,add column reviewed_at timestamptz;
alter table public.academy_assessments add column reviewed_by uuid references auth.users(id) on delete set null,add column reviewed_at timestamptz;
create or replace function private.enforce_academy_publication_review()
returns trigger language plpgsql security invoker set search_path=''
as $fn$
declare v_course text;
begin
 if current_user in ('postgres','service_role','supabase_admin') then if tg_op='DELETE' then return old; else return new; end if; end if;
 if tg_op='DELETE' then
  if tg_table_name='academy_modules' then v_course:=old.course_id; else select m.course_id into v_course from public.academy_modules m where m.id=old.module_id; end if;
  if old.status='published' and not private.can_publish_academy_course(v_course) then raise exception 'PUBLISH_REVIEW_REQUIRED'; end if;
  return old;
 end if;
 if tg_table_name='academy_modules' then v_course:=new.course_id; else select m.course_id into v_course from public.academy_modules m where m.id=new.module_id; end if;
 if new.status='published' or (tg_op='UPDATE' and old.status='published') then
  if not private.can_publish_academy_course(v_course) then raise exception 'PUBLISH_REVIEW_REQUIRED'; end if;
 end if;
 if new.status='published' then new.reviewed_by:=auth.uid();new.reviewed_at:=now();else new.reviewed_by:=null;new.reviewed_at:=null;end if;
 return new;
end;
$fn$;
revoke all on function private.enforce_academy_publication_review() from public,anon,authenticated;
create trigger academy_modules_publication_review before insert or update or delete on public.academy_modules for each row execute function private.enforce_academy_publication_review();
create trigger academy_lessons_publication_review before insert or update or delete on public.academy_lessons for each row execute function private.enforce_academy_publication_review();
create trigger academy_assessments_publication_review before insert or update or delete on public.academy_assessments for each row execute function private.enforce_academy_publication_review();
create or replace function private.enforce_academy_asset_review()
returns trigger language plpgsql security invoker set search_path=''
as $fn$
declare v_course text;v_status text;v_lesson uuid;
begin
 if current_user in ('postgres','service_role','supabase_admin') then if tg_op='DELETE' then return old; else return new; end if; end if;
 v_lesson:=case when tg_op='DELETE' then old.lesson_id else new.lesson_id end;
 select m.course_id,l.status into v_course,v_status from public.academy_lessons l join public.academy_modules m on m.id=l.module_id where l.id=v_lesson;
 if v_status='published' and not private.can_publish_academy_course(v_course) then raise exception 'PUBLISH_REVIEW_REQUIRED';end if;
 if tg_op='DELETE' then return old;end if;
 if tg_op='UPDATE' and (new.lesson_id is distinct from old.lesson_id or new.object_path is distinct from old.object_path or new.owner_id is distinct from old.owner_id or new.mime_type is distinct from old.mime_type or new.file_size is distinct from old.file_size) then raise exception 'ASSET_IDENTITY_IMMUTABLE';end if;
 return new;
end;
$fn$;
revoke all on function private.enforce_academy_asset_review() from public,anon,authenticated;
create trigger academy_asset_review before insert or update or delete on public.academy_lesson_assets for each row execute function private.enforce_academy_asset_review();
create or replace function private.enforce_academy_question_version()
returns trigger language plpgsql security invoker set search_path=''
as $fn$
declare v_status text;
begin
 if current_user in ('postgres','service_role','supabase_admin') then if tg_op='DELETE' then return old;else return new;end if;end if;
 select status into v_status from public.academy_assessments where id=case when tg_op='DELETE' then old.assessment_id else new.assessment_id end for update;
 if v_status is distinct from 'draft' then raise exception 'ASSESSMENT_VERSION_LOCKED';end if;
 if tg_op='UPDATE' and new.assessment_id is distinct from old.assessment_id then raise exception 'ASSESSMENT_VERSION_LOCKED';end if;
 if tg_op='DELETE' then return old;else return new;end if;
end;
$fn$;
revoke all on function private.enforce_academy_question_version() from public,anon,authenticated;
create trigger academy_question_version_gate before insert or update or delete on public.academy_assessment_questions for each row execute function private.enforce_academy_question_version();

-- Restore qualified admission settlement; status is also an output variable.
-- M35: synchronize successful admission invoice settlement with the admission gate.
create or replace function public.admin_mark_payment_paid(p_payment_id uuid, p_provider_reference text)
returns table(payment_id uuid, invoice_id uuid, status text)
language plpgsql security definer set search_path = public, private
as $function$
declare
  v_payment public.payments%rowtype;
  v_invoice public.invoices%rowtype;
  v_now timestamptz := now();
  v_reference text := nullif(btrim(coalesce(p_provider_reference, '')), '');
  v_live_mode boolean := false;
begin
  if auth.uid() is null or not private.is_super_admin(auth.uid()) then raise exception 'FORBIDDEN'; end if;
  select * into v_payment from public.payments where id = p_payment_id for update;
  if not found then raise exception 'PAYMENT_NOT_FOUND'; end if;
  select * into v_invoice from public.invoices where id = v_payment.invoice_id for update;
  if not found then raise exception 'INVOICE_NOT_FOUND'; end if;
  if v_payment.payer_id is distinct from v_invoice.customer_id or v_payment.amount is distinct from v_invoice.total_amount or v_payment.currency is distinct from v_invoice.currency then raise exception 'PAYMENT_INVOICE_MISMATCH'; end if;
  if v_payment.status = 'paid' then
    if v_reference is not null and v_payment.provider_reference is distinct from v_reference then raise exception 'PAYMENT_ALREADY_SETTLED_REFERENCE_MISMATCH'; end if;
    return query select v_payment.id, v_invoice.id, 'paid'::text; return;
  end if;
  if v_payment.status in ('refunded','failed') then raise exception 'PAYMENT_NOT_SETTLEABLE'; end if;
  select coalesce(bool_or(c.mode = 'live'), false) into v_live_mode from public.payment_provider_configs c where c.provider_key = v_payment.provider and c.enabled = true;
  if v_live_mode and v_reference is null then raise exception 'PAYMENT_REFERENCE_REQUIRED'; end if;
  update public.payments set status='paid', provider_reference=coalesce(v_reference,provider_reference), paid_at=coalesce(paid_at,v_now), updated_at=v_now where id=v_payment.id;
  update public.invoices set status='paid', paid_at=coalesce(paid_at,v_now), updated_at=v_now where id=v_invoice.id;
  if v_invoice.source_type = 'academy_admission' then
    update public.academy_admission_applications a
      set status='paid', payment_reference=coalesce(v_reference,v_payment.provider_reference), updated_at=v_now
      where a.id::text = v_invoice.source_id and a.status='payment_pending' and a.user_id=v_invoice.customer_id;
    if not found then raise exception 'ADMISSION_PAYMENT_STATE_MISMATCH'; end if;
  end if;
  return query select v_payment.id, v_invoice.id, 'paid'::text;
end;
$function$;
create or replace function public.admin_mark_payment_paid(p_payment_id uuid)
returns table(payment_id uuid, invoice_id uuid, status text)
language sql security definer set search_path = public, private
as $function$ select * from public.admin_mark_payment_paid(p_payment_id, null::text); $function$;
revoke all on function public.admin_mark_payment_paid(uuid) from public, anon;
revoke all on function public.admin_mark_payment_paid(uuid,text) from public, anon;
grant execute on function public.admin_mark_payment_paid(uuid) to authenticated;
grant execute on function public.admin_mark_payment_paid(uuid,text) to authenticated;

-- Require account-bound intake on the Data API as well as the Next.js endpoint.
drop policy if exists academy_admission_applications_public_submit on public.academy_admission_applications;
create policy academy_admission_applications_public_submit on public.academy_admission_applications
 for insert to authenticated with check (
 auth.uid() is not null and user_id=auth.uid() and status='submitted' and reviewer_id is null
 and reviewed_at is null and review_note='' and payment_reference is null
 and consent_at<=now() and consent_at>=now()-interval '10 minutes');
