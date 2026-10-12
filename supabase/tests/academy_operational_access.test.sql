begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select no_plan();
create temporary table academy_test_ids as select gen_random_uuid() admin_id,gen_random_uuid() learner_id,gen_random_uuid() stranger_id,gen_random_uuid() staff_id,gen_random_uuid() course_id,gen_random_uuid() other_course_id,gen_random_uuid() module_id,gen_random_uuid() lesson_one,gen_random_uuid() lesson_two,gen_random_uuid() assessment_id,gen_random_uuid() question_id,gen_random_uuid() application_id,gen_random_uuid() asset_id,gen_random_uuid() payment_id;
grant select on academy_test_ids to authenticated,anon;
insert into auth.users(id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
 select u.id,'authenticated','authenticated',u.id::text||'@academy-regression.test','',now(),'{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb,now(),now()
 from academy_test_ids t cross join lateral(values(t.admin_id),(t.learner_id),(t.stranger_id),(t.staff_id)) u(id);
insert into public.user_roles(user_id,role_id) select t.admin_id,r.id from academy_test_ids t join public.roles r on r.key='super_admin';
insert into public.courses(id,title,description,price_dzd,duration,status,published_at) select course_id,'Access fixture','Rolled back',1250,'','published',now() from academy_test_ids;
insert into public.courses(id,title,description,price_dzd,duration,status) select other_course_id,'Other fixture','Rolled back',null,'','draft' from academy_test_ids;
insert into public.academy_course_staff(course_id,user_id,staff_role,status) select course_id::text,staff_id,'teacher','active' from academy_test_ids;
insert into public.academy_modules(id,course_id,title,sort_order,status) select module_id,course_id::text,'Fixture module',1,'published' from academy_test_ids;
insert into public.academy_lessons(id,module_id,title,body,sort_order,status)
 select lesson_one,module_id,'First fixture','PRIVATE CONTENT',1,'published' from academy_test_ids
 union all select lesson_two,module_id,'Second fixture','PRIVATE CONTENT TWO',2,'published' from academy_test_ids;
insert into public.academy_assessments(id,module_id,title,pass_score,max_attempts,status) select assessment_id,module_id,'Fixture assessment',70,2,'published' from academy_test_ids;
insert into public.academy_assessment_questions(id,assessment_id,prompt,options,correct_option) select question_id,assessment_id,'Fixture question','[{"key":"a","label":"A"},{"key":"b","label":"B"}]'::jsonb,'a' from academy_test_ids;
insert into public.academy_admission_applications(id,course_id,user_id,applicant_name,applicant_email,applicant_phone,consent_at,status)
 select application_id,course_id::text,learner_id,'Fixture learner',learner_id::text||'@academy-regression.test','+213555000001',now(),'accepted' from academy_test_ids;
insert into public.academy_lesson_assets(id,lesson_id,owner_id,object_path,file_name,mime_type,file_size,status)
 select asset_id,lesson_one,staff_id,lesson_one::text||'/'||asset_id::text,'fixture.pdf','application/pdf',100,'ready' from academy_test_ids;
insert into storage.objects(bucket_id,name) select 'aslan-academy',lesson_one::text||'/'||asset_id::text from academy_test_ids;
set local role anon;
select is(jsonb_array_length(public.academy_curriculum((select course_id::text from academy_test_ids))),2,'Visitors read curriculum metadata');
select ok(public.academy_curriculum((select course_id::text from academy_test_ids))::text not like '%PRIVATE CONTENT%','Public curriculum has no lesson bodies');
select is((select count(*)::int from public.academy_lessons where module_id=(select module_id from academy_test_ids)),0,'Anonymous direct lesson reads denied');
select throws_ok($q$insert into public.academy_admission_applications(course_id,user_id,applicant_name,applicant_email,applicant_phone,consent_at,status)
 select course_id::text,null,'Anon fixture','anon@fixture.test','+213555000000',now(),'submitted' from academy_test_ids$q$,'42501',null,'Anonymous Data API intake is denied');
select throws_ok($q$select public.get_published_academy_assessment((select assessment_id from academy_test_ids))$q$,'42501',null,'Anonymous cannot retrieve assessment');
reset role;
select set_config('request.jwt.claim.sub',(select learner_id::text from academy_test_ids),true);
set local role authenticated;
select is((select count(*)::int from public.academy_lessons where module_id=(select module_id from academy_test_ids)),0,'Unpaid applicant cannot read lessons');
select throws_ok($q$insert into public.academy_admission_applications(course_id,user_id,applicant_name,applicant_email,applicant_phone,consent_at,status)
 select course_id::text,null,'Null owner fixture','null@fixture.test','+213555000000',now(),'submitted' from academy_test_ids$q$,'42501',null,'Signed-in intake cannot omit its owner');
select throws_ok($q$insert into public.academy_admission_applications(course_id,user_id,applicant_name,applicant_email,applicant_phone,consent_at,status)
 select course_id::text,stranger_id,'Other owner fixture','other@fixture.test','+213555000000',now(),'submitted' from academy_test_ids$q$,'42501',null,'Signed-in intake cannot forge another owner');
select throws_ok($q$select public.issue_academy_admission_invoice((select application_id from academy_test_ids))$q$,'P0001','FORBIDDEN','Learner cannot issue invoice');
reset role;
select set_config('request.jwt.claim.sub',(select admin_id::text from academy_test_ids),true);
set local role authenticated;
select lives_ok($q$select public.issue_academy_admission_invoice((select application_id from academy_test_ids))$q$,'Admin issues admission invoice');
select is((public.issue_academy_admission_invoice((select application_id from academy_test_ids))->>'total_amount')::numeric,1250::numeric,'Price comes from course');
select is((select count(*)::int from public.invoices where source_id=(select application_id::text from academy_test_ids)),1,'Repeated requests reuse invoice');
select is((select status from public.academy_admission_applications where id=(select application_id from academy_test_ids)),'payment_pending','Invoice and admission commit together');
reset role;
select set_config('request.jwt.claim.sub',(select learner_id::text from academy_test_ids),true);
set local role authenticated;
select throws_ok($q$select * from public.enroll_academy_learner((select course_id::text from academy_test_ids),null)$q$,'P0001','PAID_ADMISSION_REQUIRED','Invoicing does not unlock enrollment');
reset role;
insert into public.payment_provider_configs(provider_key,display_name,enabled,mode,config_data) values('academy-fixture','Fixture only',true,'live','{}'::jsonb) on conflict(provider_key) do update set enabled=true,mode='live';
insert into public.payments(id,invoice_id,payer_id,provider,amount,currency,status,idempotency_key)
 select t.payment_id,i.id,t.learner_id,'academy-fixture',i.total_amount,i.currency,'pending','academy-fixture-'||t.payment_id::text
 from academy_test_ids t join public.invoices i on i.source_type='academy_admission' and i.source_id=t.application_id::text;
select set_config('request.jwt.claim.sub',(select learner_id::text from academy_test_ids),true);
set local role authenticated;
select throws_ok($q$select * from public.admin_mark_payment_paid((select payment_id from academy_test_ids),'FIXTURE-REF')$q$,'P0001','FORBIDDEN','Learner cannot settle own payment');
reset role;
select set_config('request.jwt.claim.sub',(select admin_id::text from academy_test_ids),true);
set local role authenticated;
select lives_ok($q$select * from public.admin_mark_payment_paid((select payment_id from academy_test_ids),'FIXTURE-REF')$q$,'Trusted settlement persists payment');
select is((select status from public.academy_admission_applications where id=(select application_id from academy_test_ids)),'paid','Trusted settlement advances admission');
select lives_ok($q$select * from public.admin_mark_payment_paid((select payment_id from academy_test_ids),'FIXTURE-REF')$q$,'Repeated settlement is idempotent');
reset role;
-- verification checkpoint
select set_config('request.jwt.claim.sub',(select learner_id::text from academy_test_ids),true);
set local role authenticated;
select lives_ok($q$select * from public.enroll_academy_learner((select course_id::text from academy_test_ids),null)$q$,'Paid applicant enrolls');
select is((select count(*)::int from public.academy_lessons where id=(select lesson_one from academy_test_ids)),1,'First lesson unlocks');
select is((select count(*)::int from public.academy_lessons where id=(select lesson_two from academy_test_ids)),0,'Later lesson remains locked');
select throws_ok($q$insert into public.academy_lesson_progress(enrollment_id,lesson_id,user_id,completed,completed_at)
 select e.id,t.lesson_two,t.learner_id,true,now() from academy_test_ids t join public.academy_enrollments e on e.course_id=t.course_id::text$q$,'P0001','LESSON_ACCESS_REQUIRED','Direct progress cannot skip prerequisite');
select is(public.get_published_academy_assessment((select assessment_id from academy_test_ids)),null::jsonb,'Assessment hidden before completion');
select lives_ok($q$insert into public.academy_lesson_progress(enrollment_id,lesson_id,user_id,completed,completed_at)
 select e.id,t.lesson_one,t.learner_id,true,now() from academy_test_ids t join public.academy_enrollments e on e.course_id=t.course_id::text$q$,'First completion persists');
select is((select count(*)::int from public.academy_lessons where id=(select lesson_two from academy_test_ids)),1,'Next lesson unlocks');
select lives_ok($q$insert into public.academy_lesson_progress(enrollment_id,lesson_id,user_id,completed,completed_at)
 select e.id,t.lesson_two,t.learner_id,true,now() from academy_test_ids t join public.academy_enrollments e on e.course_id=t.course_id::text$q$,'Second completion persists');
select ok(public.get_published_academy_assessment((select assessment_id from academy_test_ids)) is not null,'Assessment unlocks after completion');
select ok(public.get_published_academy_assessment((select assessment_id from academy_test_ids))::text not like '%correct_option%','Answer keys never returned');
-- verification checkpoint
select is((select score from public.submit_academy_assessment((select assessment_id from academy_test_ids),jsonb_build_object((select question_id::text from academy_test_ids),'b'))),0,'Wrong answer graded on server');
select is((select score from public.submit_academy_assessment((select assessment_id from academy_test_ids),jsonb_build_object((select question_id::text from academy_test_ids),'a'))),100,'Correct answer graded on server');
select is((select count(*)::int from public.academy_certificates where user_id=(select learner_id from academy_test_ids)),1,'Passing assessment issues certificate');
select throws_ok($q$select * from public.submit_academy_assessment((select assessment_id from academy_test_ids),jsonb_build_object((select question_id::text from academy_test_ids),'a'))$q$,'P0001','ATTEMPT_LIMIT_REACHED','Attempt ceiling enforced');
select is((select count(*)::int from public.academy_lesson_assets where id=(select asset_id from academy_test_ids)),1,'Eligible learner reads ready metadata');
reset role;
select set_config('request.jwt.claim.sub',(select stranger_id::text from academy_test_ids),true);
set local role authenticated;
select is((select count(*)::int from public.academy_lesson_assets where id=(select asset_id from academy_test_ids)),0,'Other account cannot read attachment');
select is((select count(*)::int from storage.objects where bucket_id='aslan-academy'),0,'Other account cannot read Storage object');
reset role;
select is((select public from storage.buckets where id='aslan-academy'),false,'Bucket is private');
select set_config('request.jwt.claim.sub',(select staff_id::text from academy_test_ids),true);
set local role authenticated;
select is((select count(*)::int from public.academy_lessons where module_id=(select module_id from academy_test_ids)),2,'Assigned teacher reads course');
select is((select count(*)::int from public.courses where id=(select other_course_id from academy_test_ids)),0,'Teacher cannot read unrelated draft');
select throws_ok($q$update public.academy_lessons set body='UNREVIEWED' where id=(select lesson_one from academy_test_ids)$q$,'P0001','PUBLISH_REVIEW_REQUIRED','Teacher cannot change published lesson');
select throws_ok($q$delete from public.academy_lessons where id=(select lesson_one from academy_test_ids)$q$,'P0001','PUBLISH_REVIEW_REQUIRED','Teacher cannot delete published lesson');
with deleted as(delete from storage.objects where bucket_id='aslan-academy' returning id) select is(count(*)::int,0,'Teacher cannot delete published attachment bytes') from deleted;
select throws_ok($q$delete from public.academy_lesson_assets where id=(select asset_id from academy_test_ids)$q$,'P0001','PUBLISH_REVIEW_REQUIRED','Teacher cannot delete approved metadata');
select throws_ok($q$update public.academy_lesson_assets set status='archived' where id=(select asset_id from academy_test_ids)$q$,'P0001','PUBLISH_REVIEW_REQUIRED','Teacher cannot archive approved attachment');
select lives_ok($q$insert into public.academy_lessons(module_id,title,body,status) select module_id,'Teacher draft fixture','Draft only','review' from academy_test_ids$q$,'Teacher submits lesson for review');
reset role;
select set_config('request.jwt.claim.sub',(select admin_id::text from academy_test_ids),true);
set local role authenticated;
select lives_ok($q$update public.academy_lessons set status='published' where module_id=(select module_id from academy_test_ids) and title='Teacher draft fixture'$q$,'Admin approves lesson');
select lives_ok($q$update public.academy_lesson_assets set status='archived' where id=(select asset_id from academy_test_ids)$q$,'Admin archives attachment');
with deleted as(delete from storage.objects where bucket_id='aslan-academy' returning id) select is(count(*)::int,1,'Admin deletes archived bytes') from deleted;
reset role;
select set_config('request.jwt.claim.sub',(select learner_id::text from academy_test_ids),true);
set local role authenticated;
select is((select count(*)::int from public.academy_lesson_assets where id=(select asset_id from academy_test_ids)),0,'Archived attachment hidden');
reset role;
select * from finish();rollback;
