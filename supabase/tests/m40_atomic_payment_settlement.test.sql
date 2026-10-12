-- M40 behavioral acceptance: authorization, amount consistency, atomic persistence and replay safety.
begin;
create extension if not exists pgtap with schema extensions;
select plan(14);

create temporary table m40_ids (
  admin_id uuid not null,
  customer_id uuid not null,
  invoice_id uuid not null,
  payment_id uuid not null,
  mismatch_invoice_id uuid not null,
  mismatch_payment_id uuid not null,
  super_role_id uuid not null,
  first_paid_at timestamptz
);

insert into m40_ids
select gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
       gen_random_uuid(), gen_random_uuid(),
       (select id from public.roles where key='super_admin'), null;

insert into auth.users(id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
select admin_id,'authenticated','authenticated',admin_id::text||'@m40.test','',now(),
       '{"provider":"email","providers":["email"]}'::jsonb,'{"full_name":"M40 admin"}'::jsonb,now(),now()
from m40_ids
union all
select customer_id,'authenticated','authenticated',customer_id::text||'@m40.test','',now(),
       '{"provider":"email","providers":["email"]}'::jsonb,'{"full_name":"M40 customer"}'::jsonb,now(),now()
from m40_ids;

insert into public.user_roles(user_id,role_id)
select admin_id,super_role_id from m40_ids
on conflict do nothing;

insert into public.invoices(id,invoice_number,customer_id,source_type,source_id,currency,subtotal,tax_amount,total_amount,status)
select invoice_id,'M40-'||replace(invoice_id::text,'-',''),customer_id,'other','valid','DZD',1200,0,1200,'issued'
from m40_ids
union all
select mismatch_invoice_id,'M40-'||replace(mismatch_invoice_id::text,'-',''),customer_id,'other','mismatch','DZD',1200,0,1200,'issued'
from m40_ids;

insert into public.payments(id,invoice_id,payer_id,provider,amount,currency,status,idempotency_key)
select payment_id,invoice_id,customer_id,'test-provider',1200,'DZD','pending','m40-valid-'||payment_id::text
from m40_ids
union all
select mismatch_payment_id,mismatch_invoice_id,customer_id,'test-provider',1199,'DZD','pending','m40-mismatch-'||mismatch_payment_id::text
from m40_ids;

insert into public.payment_provider_configs(provider_key,display_name,enabled,mode,config_data)
values ('test-provider','M40 Test Provider',true,'live','{}'::jsonb)
on conflict (provider_key) do update set enabled=true,mode='live';

grant select on m40_ids to authenticated;

select set_config('request.jwt.claim.sub',(select customer_id::text from m40_ids),true);
set local role authenticated;
select throws_ok($q$select * from public.admin_mark_payment_paid((select payment_id from m40_ids))$q$,
  'P0001','FORBIDDEN','ordinary authenticated customer cannot settle a payment');

reset role;
select set_config('request.jwt.claim.sub',(select admin_id::text from m40_ids),true);
set local role authenticated;
select throws_ok($q$select * from public.admin_mark_payment_paid((select mismatch_payment_id from m40_ids))$q$,
  'P0001','PAYMENT_INVOICE_MISMATCH','settlement rejects payer/amount/currency mismatch');

reset role;
select is((select status from public.payments where id=(select mismatch_payment_id from m40_ids)),'pending',
  'rejected settlement leaves the payment pending');
select is((select status from public.invoices where id=(select mismatch_invoice_id from m40_ids)),'issued',
  'rejected settlement leaves the invoice issued');

select set_config('request.jwt.claim.sub',(select admin_id::text from m40_ids),true);
set local role authenticated;
select throws_ok($q$select * from public.admin_mark_payment_paid((select payment_id from m40_ids))$q$,
  'P0001','PAYMENT_REFERENCE_REQUIRED','live provider settlement requires a transaction reference');
reset role;
select is((select status from public.payments where id=(select payment_id from m40_ids)),'pending',
  'missing provider reference leaves payment pending');

set local role authenticated;
select is((select status from public.admin_mark_payment_paid((select payment_id from m40_ids),'M40-REF-123')),'paid',
  'authorized settlement with provider reference returns paid status');
reset role;

select is((select status from public.payments where id=(select payment_id from m40_ids)),'paid',
  'successful settlement persists payment status');
select is((select provider_reference from public.payments where id=(select payment_id from m40_ids)),
          'M40-REF-123','successful settlement persists the provider reference for read-back');
select is((select status from public.invoices where id=(select invoice_id from m40_ids)),'paid',
  'successful settlement persists invoice status atomically');
select ok((select paid_at is not null from public.payments where id=(select payment_id from m40_ids)),
  'successful settlement records payment timestamp');
select ok((select paid_at is not null from public.invoices where id=(select invoice_id from m40_ids)),
  'successful settlement records invoice timestamp');

update m40_ids set first_paid_at=(select paid_at from public.payments where id=payment_id);
select set_config('request.jwt.claim.sub',(select admin_id::text from m40_ids),true);
set local role authenticated;
select lives_ok($q$select * from public.admin_mark_payment_paid((select payment_id from m40_ids))$q$,
  'replayed settlement is safe for an already paid payment');
reset role;
select is((select paid_at from public.payments where id=(select payment_id from m40_ids)),
          (select first_paid_at from m40_ids),
          'replayed settlement preserves the original payment timestamp');

select * from finish();
rollback;
