-- M14 behavioral acceptance: checkout persists order/invoice/stock atomically, is replay-safe, and rolls back failures.
begin;
create extension if not exists pgtap with schema extensions;
select plan(13);

create temporary table m14_checkout_ids (
  user_id uuid not null,
  product_id bigint not null,
  cart_id uuid not null,
  failed_cart_id uuid not null
);
insert into m14_checkout_ids values (gen_random_uuid(),0,gen_random_uuid(),gen_random_uuid());

insert into auth.users(id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
select user_id,'authenticated','authenticated',user_id::text||'@m14-checkout.test','',now(),
       '{"provider":"email","providers":["email"]}'::jsonb,
       '{"full_name":"M14 Checkout Owner"}'::jsonb,now(),now()
from m14_checkout_ids;

insert into public.products(name,slug,description,price_dzd,stock,active)
values ('M14 Checkout Product','m14-checkout-product','Checkout transaction test',250,5,true);

update m14_checkout_ids
set product_id=(select id from public.products where slug='m14-checkout-product');

insert into public.carts(id,user_id,status,currency)
select cart_id,user_id,'active','DZD' from m14_checkout_ids;

insert into public.cart_items(cart_id,product_id,quantity,unit_price)
select cart_id,product_id,2,250 from m14_checkout_ids;

insert into public.inventory_items(product_id,sku,quantity_on_hand,quantity_reserved,reorder_level,status)
select product_id,'M14-CHECKOUT-SKU',5,0,0,'active' from m14_checkout_ids;

grant select on m14_checkout_ids to authenticated;
select set_config('request.jwt.claim.sub',(select user_id::text from m14_checkout_ids),true);
set local role authenticated;

select lives_ok($q$
  select public.checkout_active_cart(
    'M14-ORDER-'||(select substr(user_id::text,1,8) from m14_checkout_ids),
    '{"recipient_name":"M14 Owner","phone":"+213555000001","wilaya":"Batna","address":"Acceptance test address"}'::jsonb
  )
$q$,'valid checkout transaction succeeds');

select is((select count(*)::int from public.orders
  where cart_id=(select cart_id from m14_checkout_ids) and status='pending'),1,
  'checkout persists exactly one pending market order');

select is((select count(*)::int from public.order_items oi join public.orders o on o.id=oi.order_id
  where o.cart_id=(select cart_id from m14_checkout_ids) and oi.quantity=2 and oi.line_total=500),1,
  'checkout persists the order item and calculated line total');

select is((select count(*)::int from public.invoices i join public.orders o on i.source_id=o.id::text
  where o.cart_id=(select cart_id from m14_checkout_ids) and i.source_type='order'
    and i.status='issued' and i.total_amount=500),1,
  'checkout persists the matching issued invoice');

select is((select status from public.carts where id=(select cart_id from m14_checkout_ids)),
  'converted','checkout converts the active cart');

select lives_ok($q$
  select public.checkout_active_cart(
    'M14-REPLAY-'||(select substr(user_id::text,1,8) from m14_checkout_ids),
    '{"recipient_name":"M14 Owner","phone":"+213555000001","wilaya":"Batna","address":"Replay address"}'::jsonb
  )
$q$,'replayed checkout returns the existing order');

select is((select count(*)::int from public.orders where cart_id=(select cart_id from m14_checkout_ids)),1,
  'replayed checkout does not create a duplicate order');

reset role;
select is((select quantity_reserved from public.inventory_items
  where product_id=(select product_id from m14_checkout_ids)),2,
  'successful checkout reserves stock exactly once');

select is((select count(*)::int from public.inventory_movements
  where reference_type='order' and reference_id=(select id::text from public.orders
    where cart_id=(select cart_id from m14_checkout_ids))),1,
  'successful checkout records one stock reservation movement');

insert into public.carts(id,user_id,status,currency)
select failed_cart_id,user_id,'active','DZD' from m14_checkout_ids;
insert into public.cart_items(cart_id,product_id,quantity,unit_price)
select failed_cart_id,product_id,99,250 from m14_checkout_ids;

set local role authenticated;
select throws_ok($q$
  select public.checkout_active_cart(
    'M14-FAIL-'||(select substr(user_id::text,1,8) from m14_checkout_ids),
    '{"recipient_name":"M14 Owner","phone":"+213555000001","wilaya":"Batna","address":"Rollback test"}'::jsonb
  )
$q$,'P0001',null,'insufficient stock rejects checkout');

select is((select status from public.carts where id=(select failed_cart_id from m14_checkout_ids)),
  'active','failed checkout leaves the second cart active');

select is((select count(*)::int from public.orders where cart_id=(select failed_cart_id from m14_checkout_ids)),0,
  'failed checkout rolls back order creation');

reset role;
select is((select quantity_reserved from public.inventory_items
  where product_id=(select product_id from m14_checkout_ids)),2,
  'failed checkout rolls back any additional stock reservation');

select * from finish();
rollback;
