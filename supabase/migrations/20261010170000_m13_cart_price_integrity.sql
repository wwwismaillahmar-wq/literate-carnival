-- M13/M14: prevent client-controlled or stale cart prices from reaching checkout.
-- Active carts follow the current catalog price; converted carts retain their historical snapshot.
create or replace function private.enforce_cart_item_catalog_price()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_price numeric(12,2);
  v_active boolean;
begin
  select p.price_dzd, p.active
    into v_price, v_active
    from public.products p
   where p.id = new.product_id
   for share;

  if not found or not v_active then
    raise exception 'PRODUCT_NOT_AVAILABLE';
  end if;
  if v_price is null then
    raise exception 'PRODUCT_PRICE_REQUIRED';
  end if;
  if new.unit_price is distinct from v_price then
    raise exception 'CART_PRICE_MISMATCH';
  end if;
  return new;
end;
$function$;

revoke all on function private.enforce_cart_item_catalog_price() from public, anon, authenticated;

drop trigger if exists cart_items_catalog_price_guard on public.cart_items;
create trigger cart_items_catalog_price_guard
before insert or update of product_id, unit_price on public.cart_items
for each row execute function private.enforce_cart_item_catalog_price();

create or replace function private.sync_active_cart_prices_after_catalog_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if new.price_dzd is null and exists (
    select 1
      from public.cart_items ci
      join public.carts c on c.id = ci.cart_id
     where ci.product_id = new.id and c.status = 'active'
  ) then
    raise exception 'PRODUCT_PRICE_REQUIRED';
  end if;

  if new.price_dzd is distinct from old.price_dzd then
    update public.cart_items ci
       set unit_price = new.price_dzd,
           updated_at = now()
      from public.carts c
     where c.id = ci.cart_id
       and c.status = 'active'
       and ci.product_id = new.id;
  end if;
  return new;
end;
$function$;

revoke all on function private.sync_active_cart_prices_after_catalog_change() from public, anon, authenticated;

drop trigger if exists products_sync_active_cart_prices on public.products;
create trigger products_sync_active_cart_prices
after update of price_dzd on public.products
for each row execute function private.sync_active_cart_prices_after_catalog_change();

-- Repair stale snapshots in active carts on migration replay; order items remain immutable.
update public.cart_items ci
   set unit_price = p.price_dzd,
       updated_at = now()
  from public.products p, public.carts c
 where p.id = ci.product_id
   and c.id = ci.cart_id
   and c.status = 'active'
   and p.price_dzd is not null
   and ci.unit_price is distinct from p.price_dzd;
