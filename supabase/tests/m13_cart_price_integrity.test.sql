-- M13/M14 behavioral acceptance: cart prices cannot be forged and active carts track catalog changes.
begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

create temporary table m13_cart_price_ids (
  user_id uuid not null,
  product_id bigint not null,
  cart_id uuid not null
);
insert into m13_cart_price_ids values (gen_random_uuid(), 0, gen_random_uuid());

insert into auth.users(id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
select user_id,'authenticated','authenticated',user_id::text||'@m13-price.test','',now(),
       '{"provider":"email","providers":["email"]}'::jsonb,
       '{"full_name":"M13 Price Owner"}'::jsonb,now(),now()
from m13_cart_price_ids;

insert into public.products(name,slug,description,price_dzd,stock,active)
values ('M13 Price Test Product','m13-price-test-product','Cart price integrity test',100,10,true)
;

update m13_cart_price_ids
set product_id=(select id from public.products where slug='m13-price-test-product');

insert into public.carts(id,user_id,status,currency)
select cart_id,user_id,'active','DZD' from m13_cart_price_ids;

grant select on m13_cart_price_ids to authenticated;
select set_config('request.jwt.claim.sub',(select user_id::text from m13_cart_price_ids),true);
set local role authenticated;

select throws_ok($q$
  insert into public.cart_items(cart_id,product_id,quantity,unit_price)
  select cart_id,product_id,1,1 from m13_cart_price_ids
$q$,'P0001','CART_PRICE_MISMATCH','customer cannot inject a price below the catalog price');

select lives_ok($q$
  insert into public.cart_items(cart_id,product_id,quantity,unit_price)
  select cart_id,product_id,1,100 from m13_cart_price_ids
$q$,'valid catalog-priced cart item is persisted');

select is((select ci.unit_price from public.cart_items ci
  where ci.cart_id=(select cart_id from m13_cart_price_ids)),100::numeric,
  'saved cart item price can be read back');

reset role;
select lives_ok($q$
  update public.products set price_dzd=150
  where id=(select product_id from m13_cart_price_ids)
$q$,'catalog price update succeeds');
select is((select ci.unit_price from public.cart_items ci
  where ci.cart_id=(select cart_id from m13_cart_price_ids)),150::numeric,
  'catalog price change synchronizes active cart snapshots');

set local role authenticated;
select throws_ok($q$
  update public.cart_items set unit_price=99
  where cart_id=(select cart_id from m13_cart_price_ids)
$q$,'P0001','CART_PRICE_MISMATCH','customer cannot tamper with the saved cart price');

select is((select ci.unit_price from public.cart_items ci
  where ci.cart_id=(select cart_id from m13_cart_price_ids)),150::numeric,
  'rejected price tampering leaves the saved price unchanged');

select ok(exists(select 1 from pg_trigger where tgname='cart_items_catalog_price_guard' and not tgisinternal),
  'catalog price guard trigger is installed');

reset role;
select * from finish();
rollback;
