-- M36 end-to-end database acceptance: proposal, partner acceptance, activation, earnings and payouts.
begin;
create extension if not exists pgtap with schema extensions;
select plan(23);
select has_table('public','partner_contracts','versioned partner contracts are persisted');
select has_table('public','partner_contract_versions','contract revisions are immutable version records');
select has_table('public','partner_payout_profiles','verified payout destinations are persisted');
select has_table('public','partner_revenue_ledger','partner earnings and debits are recorded in a ledger');

create temporary table m36_flow_ids (
  admin_id uuid not null,
  partner_id uuid not null,
  outsider_id uuid not null,
  application_id uuid not null,
  contract_id uuid,
  version_id uuid,
  profile_id uuid,
  ledger_id uuid,
  payout_id uuid
);
insert into m36_flow_ids values (
  gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),null,null,null,null,null
);

insert into auth.users(id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
select admin_id,'authenticated','authenticated',admin_id::text||'@m36-contract.test','',now(),
       '{"provider":"email","providers":["email"]}'::jsonb,'{"full_name":"M36 Super Admin"}'::jsonb,now(),now()
from m36_flow_ids
union all
select partner_id,'authenticated','authenticated',partner_id::text||'@m36-contract.test','',now(),
       '{"provider":"email","providers":["email"]}'::jsonb,'{"full_name":"M36 Partner Owner"}'::jsonb,now(),now()
from m36_flow_ids
union all
select outsider_id,'authenticated','authenticated',outsider_id::text||'@m36-contract.test','',now(),
       '{"provider":"email","providers":["email"]}'::jsonb,'{"full_name":"M36 Outsider"}'::jsonb,now(),now()
from m36_flow_ids;

insert into public.user_roles(user_id,role_id)
select admin_id,(select id from public.roles where key='super_admin') from m36_flow_ids
on conflict do nothing;

insert into public.partner_applications(id,owner_id,contact_name,phone,email,organization_name,partnership_type,message,status)
select application_id,partner_id,'M36 Partner Owner','+213555000001',partner_id::text||'@m36-contract.test',
       'M36 Contract Org','business','Application for versioned contract and payout workflow','submitted'
from m36_flow_ids;

update public.partner_applications
set status='approved'
where id=(select application_id from m36_flow_ids);

grant select, update on m36_flow_ids to authenticated;
select has_function('public','admin_create_partner_contract',array['uuid','text','text','text','integer','text'],
  'superadmin contract creation transaction is installed');

select set_config('request.jwt.claim.sub',(select admin_id::text from m36_flow_ids),true);
set local role authenticated;
update m36_flow_ids set contract_id=(
  select contract_id from public.admin_create_partner_contract(
    (select application_id from m36_flow_ids),'M36-CONTRACT-001','M36 Partner Agreement',
    'This agreement defines partner responsibilities, reporting, revenue share and dispute resolution.',
    1500,'DZD'
  )
);
update m36_flow_ids set version_id=(
  select id from public.partner_contract_versions where contract_id=(select contract_id from m36_flow_ids)
);
select is((select status from public.partner_contracts where id=(select contract_id from m36_flow_ids)),
  'proposed','admin creates a persisted proposed contract and immutable first version');

reset role;
select set_config('request.jwt.claim.sub',(select partner_id::text from m36_flow_ids),true);
set local role authenticated;
select lives_ok($q$
  select * from public.partner_accept_contract_version(
    (select version_id from m36_flow_ids),'M36 Partner Owner'
  )
$q$,'contract owner accepts the exact current version');
select is((select status from public.partner_contracts where id=(select contract_id from m36_flow_ids)),
  'accepted','partner acceptance changes contract state');
select is((select count(*)::int from public.partner_contract_signatures
  where contract_id=(select contract_id from m36_flow_ids)
    and accepted_terms_hash=(select terms_hash from public.partner_contract_versions where id=(select version_id from m36_flow_ids))),1,
  'acceptance records the exact signed terms hash');

reset role;
select set_config('request.jwt.claim.sub',(select admin_id::text from m36_flow_ids),true);
set local role authenticated;
select lives_ok($q$select * from public.admin_activate_partner_contract((select contract_id from m36_flow_ids))$q$,
  'admin activates only a partner-accepted current version');
select is((select status from public.partner_contracts where id=(select contract_id from m36_flow_ids)),
  'active','contract activation persists');

reset role;
select set_config('request.jwt.claim.sub',(select partner_id::text from m36_flow_ids),true);
set local role authenticated;
update m36_flow_ids set profile_id=(
  select profile_id from public.partner_create_payout_profile(
    'test-provider','DZ','M36 Partner Owner','****1234','provider-token-m36-123456'
  )
);
select is((select status from public.partner_payout_profiles where id=(select profile_id from m36_flow_ids)),
  'pending','partner payout profile is private and awaits verification');

reset role;
select set_config('request.jwt.claim.sub',(select admin_id::text from m36_flow_ids),true);
set local role authenticated;
select lives_ok($q$
  select * from public.admin_review_partner_payout_profile((select profile_id from m36_flow_ids),'verified','Provider token checked')
$q$,'admin verifies the payout profile');
update m36_flow_ids set ledger_id=(
  select ledger_entry_id from public.admin_record_partner_earning(
    (select contract_id from m36_flow_ids),'order','M36-ORDER-0001',1000,'DZD','m36-earning-0001'
  )
);
select lives_ok($q$select * from public.admin_review_partner_earning((select ledger_id from m36_flow_ids),'approved')$q$,
  'admin approves an idempotent partner earning');

reset role;
select set_config('request.jwt.claim.sub',(select partner_id::text from m36_flow_ids),true);
set local role authenticated;
update m36_flow_ids set payout_id=(
  select payout_id from public.partner_request_payout(
    (select profile_id from m36_flow_ids),500,'DZD','m36-payout-0001'
  )
);
select throws_ok($q$
  select * from public.partner_request_payout(
    (select profile_id from m36_flow_ids),600,'DZD','m36-payout-overdraw-1'
  )
$q$,'P0001','INSUFFICIENT_PARTNER_BALANCE','payout requests cannot reserve more than the available approved balance');

reset role;
select set_config('request.jwt.claim.sub',(select admin_id::text from m36_flow_ids),true);
set local role authenticated;
select lives_ok($q$select * from public.admin_review_partner_payout((select payout_id from m36_flow_ids),'approved',null,'Approved')$q$,
  'admin approves the requested payout');
select lives_ok($q$select * from public.admin_review_partner_payout((select payout_id from m36_flow_ids),'processing',null,'Sent to provider')$q$,
  'admin advances payout to processing');
select lives_ok($q$select * from public.admin_review_partner_payout((select payout_id from m36_flow_ids),'paid','M36-PAYOUT-REF-123','Provider confirmed payout')$q$,
  'payout can be settled only with a provider reference');
select is((select status from public.partner_payouts where id=(select payout_id from m36_flow_ids)),
  'paid','payout status is persisted');
select is((select count(*)::int from public.partner_revenue_ledger
  where source_type='payout' and source_id=(select payout_id::text from m36_flow_ids)
    and direction='debit' and status='paid'),1,
  'payout settlement writes one matching debit ledger entry');

reset role;
select set_config('request.jwt.claim.sub',(select partner_id::text from m36_flow_ids),true);
set local role authenticated;
select is((select already_requested from public.partner_request_payout(
  (select profile_id from m36_flow_ids),500,'DZD','m36-payout-0001'
)),true,'replayed payout request returns the same payout without reserving funds twice');

reset role;
select set_config('request.jwt.claim.sub',(select outsider_id::text from m36_flow_ids),true);
set local role authenticated;
select is((select count(*)::int from public.partner_contracts where id=(select contract_id from m36_flow_ids)),0,
  'unrelated account cannot read another partner contract');
select is((select count(*)::int from public.partner_revenue_ledger where owner_id=(select partner_id from m36_flow_ids)),0,
  'unrelated account cannot read another partner ledger');

reset role;
select * from finish();
rollback;
