-- M34 behavioral acceptance: users cannot self-enroll without a paid admission decision.
begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

create temporary table m34_paid_gate_ids (
  user_id uuid not null,
  course_id uuid not null
);
insert into m34_paid_gate_ids values (gen_random_uuid(),gen_random_uuid());

insert into auth.users(id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
select user_id,'authenticated','authenticated',user_id::text||'@m34-paid-gate.test','',now(),
       '{"provider":"email","providers":["email"]}'::jsonb,
       '{"full_name":"M34 Paid Gate Learner"}'::jsonb,now(),now()
from m34_paid_gate_ids;

insert into public.courses(id,title,description,price_dzd,duration,status,published_at)
select course_id,'M34 Paid Gate Course','Enrollment authorization test',1000,'2 weeks','published',now()
from m34_paid_gate_ids;

grant select on m34_paid_gate_ids to authenticated;
select has_function('public','enroll_academy_learner',array['text','uuid'],
  'the validated enrollment transaction is installed');

select set_config('request.jwt.claim.sub',(select user_id::text from m34_paid_gate_ids),true);
set local role authenticated;

select throws_ok($q$
  insert into public.academy_enrollments(user_id,course_id,status)
  select user_id,course_id::text,'enrolled' from m34_paid_gate_ids
$q$,'42501',null,'authenticated users cannot forge enrollment rows directly');

select throws_ok($q$
  select * from public.enroll_academy_learner(
    (select course_id::text from m34_paid_gate_ids),null
  )
$q$,'P0001','PAID_ADMISSION_REQUIRED','enrollment is rejected before a paid admission exists');

reset role;
insert into public.academy_admission_applications(
  course_id,user_id,applicant_name,applicant_email,applicant_phone,answers,screening_version,
  consent_at,status
)
select course_id::text,user_id,'M34 Paid Learner',user_id::text||'@m34-paid-gate.test','+213555000001',
       '{}'::jsonb,'{}'::jsonb,now(),'paid'
from m34_paid_gate_ids;

set local role authenticated;
select lives_ok($q$
  select * from public.enroll_academy_learner(
    (select course_id::text from m34_paid_gate_ids),null
  )
$q$,'a paid admission allows the validated enrollment transaction');

select is((select count(*)::int from public.academy_enrollments
  where user_id=(select user_id from m34_paid_gate_ids)
    and course_id=(select course_id::text from m34_paid_gate_ids)),1,
  'successful enrollment is persisted exactly once');

select is((select status from public.academy_enrollments
  where user_id=(select user_id from m34_paid_gate_ids)
    and course_id=(select course_id::text from m34_paid_gate_ids)),
  'enrolled','persisted enrollment can be read back by its owner');

select is((select already_enrolled from public.enroll_academy_learner(
  (select course_id::text from m34_paid_gate_ids),null
)),true,'replayed enrollment reports the existing record rather than creating another');

select is((select count(*)::int from public.academy_enrollments
  where user_id=(select user_id from m34_paid_gate_ids)
    and course_id=(select course_id::text from m34_paid_gate_ids)),1,
  'replayed enrollment remains idempotent');

reset role;
select * from finish();
rollback;
