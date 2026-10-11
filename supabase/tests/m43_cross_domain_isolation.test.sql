-- M43 behavioral acceptance: prove cross-user and cross-domain rows are not exposed by shared identity.
-- Run with: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(17);

create temporary table m43_ids (
  user_one uuid not null,
  user_two uuid not null,
  application_id uuid not null,
  talent_profile_id uuid not null,
  identity_profile_id uuid not null,
  enrollment_id uuid not null,
  order_id uuid not null,
  service_request_id uuid not null,
  service_id uuid not null
);

insert into m43_ids
select gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
       gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
       gen_random_uuid(), gen_random_uuid(), gen_random_uuid();

insert into auth.users(id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
select user_one,'authenticated','authenticated',user_one::text||'@m43.test','',now(),
       '{"provider":"email","providers":["email"]}'::jsonb,
       '{"full_name":"M43 owner"}'::jsonb,now(),now() from m43_ids
union all
select user_two,'authenticated','authenticated',user_two::text||'@m43.test','',now(),
       '{"provider":"email","providers":["email"]}'::jsonb,
       '{"full_name":"M43 other user"}'::jsonb,now(),now() from m43_ids;

-- Seed rows as the database owner, then test through the authenticated role and JWT identity.
insert into public.partner_applications(id, owner_id, contact_name, phone, email, organization_name, partnership_type, message, status)
select application_id, user_one, 'M43 Owner', '+213555000001', user_one::text||'@m43.test',
       'M43 Partner Organization', 'business', 'Request for partnership review', 'submitted'
from m43_ids;

insert into public.talent_profiles(id, user_id, headline, bio, public_profile, review_status)
select talent_profile_id, user_one, 'Private draft', 'Not publicly verified', false, 'draft'
from m43_ids;

insert into public.partner_identity_profiles(
  id, user_id, subject_type, legal_name, country_code, consent_at, review_status
)
select identity_profile_id, user_one, 'individual', 'M43 Test Identity', 'DZ', now(), 'pending'
from m43_ids;

insert into public.academy_enrollments(id, user_id, course_id, status)
select enrollment_id, user_one, 'm43-private-course', 'enrolled'
from m43_ids;

insert into public.services(id,name,slug,description,active)
select service_id,'M43 Service','m43-service','Private service-request isolation test',true
from m43_ids;

insert into public.service_requests(id,request_number,customer_id,service_id,description,status)
select service_request_id,'M43-SR-'||substr(user_one::text,1,8),user_one,service_id,
       'Private service request isolation test','submitted'
from m43_ids;

insert into public.orders(id,user_id,order_number,status,currency,subtotal,shipping_amount,total_amount,shipping_address)
select order_id,user_one,'M43-ORD-'||substr(user_one::text,1,8),'pending','DZD',100,0,100,
       '{"recipient_name":"M43 Owner","phone":"+213555000001","wilaya":"Batna","address":"Test address"}'::jsonb
from m43_ids;

grant select on m43_ids to authenticated;

select set_config('request.jwt.claim.sub',(select user_two::text from m43_ids),true);
set local role authenticated;

select is((select count(*)::int from public.partner_applications where id=(select application_id from m43_ids)),0,
  'another account cannot read the partner application');
select is((select count(*)::int from public.talent_profiles where id=(select talent_profile_id from m43_ids)),0,
  'another account cannot read a private talent profile');
select is((select count(*)::int from public.partner_identity_profiles where id=(select identity_profile_id from m43_ids)),0,
  'another account cannot read private partner identity data');
select is((select count(*)::int from public.academy_enrollments where id=(select enrollment_id from m43_ids)),0,
  'another account cannot read a learner enrollment');
select is((select count(*)::int from public.orders where id=(select order_id from m43_ids)),0,
  'another account cannot read a market order');
select is((select count(*)::int from public.service_requests where id=(select service_request_id from m43_ids)),0,
  'another account cannot read a service request');
select throws_ok($q$
  insert into public.partner_applications(owner_id,contact_name,phone,email,organization_name,partnership_type,message)
  select user_one,'Forged Owner','+213555000002','forged@m43.test','Forged Organization','business','Attempt to impersonate another owner'
  from m43_ids
$q$,'42501',null,'partner intake cannot assign an application to another authenticated owner');

reset role;
select set_config('request.jwt.claim.sub',(select user_one::text from m43_ids),true);
set local role authenticated;

select is((select count(*)::int from public.partner_applications where id=(select application_id from m43_ids)),1,
  'application owner can read their persisted application');
select is((select count(*)::int from public.talent_profiles where id=(select talent_profile_id from m43_ids)),1,
  'talent profile owner can read their private profile');
select is((select count(*)::int from public.partner_identity_profiles where id=(select identity_profile_id from m43_ids)),1,
  'identity owner can read their private identity profile');
select is((select count(*)::int from public.academy_enrollments where id=(select enrollment_id from m43_ids)),1,
  'learner can read their own enrollment');
select is((select count(*)::int from public.orders where id=(select order_id from m43_ids)),1,
  'market order owner can read the persisted order');
select is((select count(*)::int from public.service_requests where id=(select service_request_id from m43_ids)),1,
  'service request owner can read the persisted request');

select throws_ok($q$
  update public.talent_profiles
     set review_status='verified', reviewed_by=(select user_one from m43_ids), reviewed_at=now()
   where id=(select talent_profile_id from m43_ids)
$q$,'42501',null,'profile owner cannot self-verify talent evidence');
select throws_ok($q$
  update public.partner_identity_profiles
     set review_status='verified', reviewer_id=(select user_one from m43_ids), reviewed_at=now()
   where id=(select identity_profile_id from m43_ids)
$q$,'42501',null,'identity owner cannot approve their own due diligence');
update public.partner_applications
   set status='approved'
 where id=(select application_id from m43_ids);
select is((select status from public.partner_applications where id=(select application_id from m43_ids)),
          'submitted','partner application owner cannot approve their own application');

update public.academy_enrollments
   set status='completed'
 where id=(select enrollment_id from m43_ids);
select is((select status from public.academy_enrollments where id=(select enrollment_id from m43_ids)),
          'enrolled','learner cannot directly change enrollment lifecycle state');

reset role;
select * from finish();
rollback;
