-- M33 behavioral acceptance: academy offerings are scoped to active schools and branches.
begin;
create extension if not exists pgtap with schema extensions;
select plan(13);

create temporary table m33_school_ids (
  manager_id uuid not null,
  active_school_id uuid not null,
  suspended_school_id uuid not null,
  active_branch_id uuid not null,
  course_id uuid not null,
  published_offering_id uuid not null,
  draft_offering_id uuid not null,
  suspended_offering_id uuid not null
);
insert into m33_school_ids values (
  gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),
  gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid()
);

insert into auth.users(id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
select manager_id,'authenticated','authenticated',manager_id::text||'@m33-school.test','',now(),
       '{"provider":"email","providers":["email"]}'::jsonb,
       '{"full_name":"M33 School Owner"}'::jsonb,now(),now()
from m33_school_ids;

insert into public.academy_schools(id,slug,name,default_language,supported_languages,status,created_by)
select active_school_id,'m33-active-school','M33 Active School','ar',
       array['ar','fr','en','es','de','it']::text[],'active',manager_id
from m33_school_ids
union all
select suspended_school_id,'m33-suspended-school','M33 Suspended School','ar',
       array['ar','fr','en','es','de','it']::text[],'suspended',manager_id
from m33_school_ids;

insert into public.academy_branches(id,school_id,slug,name,language,status)
select active_branch_id,active_school_id,'m33-active-branch','M33 Active Branch','ar','active'
from m33_school_ids;

insert into public.courses(id,title,description,price_dzd,duration,status,published_at)
select course_id,'M33 Multi-School Course','Branch and language offering test',1000,'4 weeks','published',now()
from m33_school_ids;

insert into public.academy_course_offerings(id,school_id,branch_id,course_id,language,status,created_by)
select published_offering_id,active_school_id,active_branch_id,course_id,'ar','published',manager_id
from m33_school_ids
union all
select draft_offering_id,active_school_id,active_branch_id,course_id,'fr','draft',manager_id
from m33_school_ids
union all
select suspended_offering_id,suspended_school_id,null,course_id,'ar','published',manager_id
from m33_school_ids;

insert into public.academy_school_memberships(school_id,user_id,role,status,created_by)
select active_school_id,manager_id,'owner','active',manager_id from m33_school_ids;

grant select on m33_school_ids to anon, authenticated;

select has_table('public','academy_schools','academy school records are persisted');
select has_table('public','academy_branches','school branches are persisted independently');
select has_table('public','academy_school_memberships','school membership and role assignments are persisted');
select has_table('public','academy_course_offerings','courses can be offered by school, branch and language');
select has_column('public','academy_schools','supported_languages','each school declares supported languages');
select has_column('public','academy_course_offerings','branch_id','course offerings can be scoped to a branch');

set local role anon;
select is((select count(*)::int from public.academy_course_offerings
  where id=(select published_offering_id from m33_school_ids)),1,
  'anonymous visitors can read a published offering in an active school and branch');
select is((select count(*)::int from public.academy_course_offerings
  where id=(select draft_offering_id from m33_school_ids)),0,
  'draft offerings remain private');
select is((select count(*)::int from public.academy_course_offerings
  where id=(select suspended_offering_id from m33_school_ids)),0,
  'published offerings remain hidden when their school is suspended');

reset role;
select set_config('request.jwt.claim.sub',(select manager_id::text from m33_school_ids),true);
set local role authenticated;
select lives_ok($q$
  insert into public.academy_branches(school_id,slug,name,language,status)
  select active_school_id,'m33-manager-branch','Manager Branch','fr','active'
  from m33_school_ids
$q$,'an active school owner can create a branch within their own school');

select throws_ok($q$
  insert into public.academy_branches(school_id,slug,name,language,status)
  select suspended_school_id,'m33-forged-branch','Forged Cross-School Branch','ar','active'
  from m33_school_ids
$q$,'42501',null,'school owner cannot create a branch in another school');

select is((select count(*)::int from public.academy_branches
  where school_id=(select active_school_id from m33_school_ids)
    and slug='m33-manager-branch'),1,
  'branch creation persists and can be read back within the authorized school');

reset role;
select * from finish();
rollback;
