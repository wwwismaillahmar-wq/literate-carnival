-- M17 behavioral acceptance: request creation and lifecycle changes cannot bypass validated RPCs.
begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

create temporary table m17_service_write_ids (
  user_id uuid not null,
  service_id uuid not null
);
insert into m17_service_write_ids values (gen_random_uuid(), gen_random_uuid());

insert into auth.users(id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
select user_id,'authenticated','authenticated',user_id::text||'@m17-write.test','',now(),
       '{"provider":"email","providers":["email"]}'::jsonb,
       '{"full_name":"M17 Request Owner"}'::jsonb,now(),now()
from m17_service_write_ids;

insert into public.services(id,name,slug,description,active)
select service_id,'M17 Test Service','m17-test-service','Service request authorization test',true
from m17_service_write_ids
on conflict (id) do nothing;

grant select on m17_service_write_ids to authenticated;
select set_config('request.jwt.claim.sub',(select user_id::text from m17_service_write_ids),true);
set local role authenticated;

select has_function('public','create_service_request',array['text','uuid','text','timestamp with time zone'],
  'request creation remains available through the validated RPC');

select throws_ok($q$
  insert into public.service_requests(request_number,customer_id,service_id,description,status)
  select 'M17-FORGED-'||substr(user_id::text,1,8),user_id,service_id,
         'Forged direct insert','completed'
  from m17_service_write_ids
$q$,'42501',null,'customers cannot bypass request validation or forge an initial lifecycle state');

select lives_ok($q$
  select public.create_service_request(
    'M17-VALID-'||(select substr(user_id::text,1,8) from m17_service_write_ids),
    (select service_id from m17_service_write_ids),
    'Valid request through RPC',
    null
  )
$q$,'validated service request transaction succeeds');

select is((select status from public.service_requests
  where request_number='M17-VALID-'||(select substr(user_id::text,1,8) from m17_service_write_ids)),
  'submitted','RPC persists the initial status and the row can be read back');

update public.service_requests set status='completed'
where request_number='M17-VALID-'||(select substr(user_id::text,1,8) from m17_service_write_ids);
select is((select status from public.service_requests
  where request_number='M17-VALID-'||(select substr(user_id::text,1,8) from m17_service_write_ids)),
  'submitted','RLS prevents customers from directly changing request lifecycle state');

select throws_ok($q$
  select public.transition_service_request(
    (select id from public.service_requests
      where request_number='M17-VALID-'||(select substr(user_id::text,1,8) from m17_service_write_ids)),
    'completed','attempted lifecycle bypass'
  )
$q$,'P0001','INVALID_TRANSITION','state machine rejects skipping required service milestones');

select lives_ok($q$
  select public.transition_service_request(
    (select id from public.service_requests
      where request_number='M17-VALID-'||(select substr(user_id::text,1,8) from m17_service_write_ids)),
    'cancelled','customer cancellation'
  )
$q$,'customer can use an allowed transition through the state machine');

select is((select status from public.service_requests
  where request_number='M17-VALID-'||(select substr(user_id::text,1,8) from m17_service_write_ids)),
  'cancelled','allowed lifecycle transition persists and is visible on read-back');

reset role;
select * from finish();
rollback;
