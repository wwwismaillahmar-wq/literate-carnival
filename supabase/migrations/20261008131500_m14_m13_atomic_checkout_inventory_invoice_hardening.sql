alter table public.orders
  add column if not exists shipping_address jsonb not null default '{}'::jsonb;

alter table public.orders
  drop constraint if exists orders_shipping_address_object_check;

alter table public.orders
  add constraint orders_shipping_address_object_check
  check (jsonb_typeof(shipping_address) = 'object');

create or replace function public.checkout_active_cart(
  p_order_number text default null,
  p_shipping_address jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, private
as $function$
declare
  v_user uuid := auth.uid();
  v_cart uuid;
  v_cart_status text;
  v_order uuid;
  v_existing_order uuid;
  v_subtotal numeric := 0;
  v_currency text;
  v_order_number text := nullif(trim(coalesce(p_order_number, '')), '');
  v_item record;
  v_inventory_id uuid;
  v_on_hand integer;
  v_reserved integer;
  v_invoice_exists boolean;
begin
  if v_user is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if p_shipping_address is null
     or jsonb_typeof(p_shipping_address) <> 'object'
     or coalesce(p_shipping_address->>'recipient_name','') = ''
     or coalesce(p_shipping_address->>'phone','') = ''
     or coalesce(p_shipping_address->>'wilaya','') = ''
     or coalesce(p_shipping_address->>'address','') = ''
  then
    raise exception 'SHIPPING_ADDRESS_REQUIRED';
  end if;

  select id, status, currency
    into v_cart, v_cart_status, v_currency
    from public.carts
   where user_id = v_user
     and status in ('active','converted')
   order by updated_at desc
   limit 1
   for update;

  if v_cart is null then
    raise exception 'CART_NOT_FOUND';
  end if;

  if v_cart_status = 'converted' then
    select id
      into v_existing_order
      from public.orders
     where cart_id = v_cart
       and user_id = v_user
     order by created_at desc
     limit 1;

    if v_existing_order is null then
      raise exception 'ORDER_NOT_FOUND_FOR_CONVERTED_CART';
    end if;

    select exists(
      select 1
      from public.invoices
      where customer_id = v_user
        and source_type = 'order'
        and source_id = v_existing_order::text
    ) into v_invoice_exists;

    if not v_invoice_exists then
      insert into public.invoices(
        invoice_number, customer_id, source_type, source_id,
        currency, subtotal, tax_amount, total_amount, status
      )
      values(
        'INV-' || upper(substr(replace(v_existing_order::text,'-',''),1,12)),
        v_user,
        'order',
        v_existing_order::text,
        v_currency,
        coalesce((select subtotal from public.orders where id=v_existing_order),0),
        0,
        coalesce((select total_amount from public.orders where id=v_existing_order),0),
        'issued'
      );
    end if;

    return v_existing_order;
  end if;

  if v_order_number is null then
    v_order_number := 'ORD-' || to_char(now(),'YYYYMMDDHH24MISS') || '-' ||
      upper(substr(replace(gen_random_uuid()::text,'-',''),1,8));
  end if;

  if exists(
    select 1 from public.orders
    where user_id = v_user and order_number = v_order_number
  ) then
    select id into v_existing_order
    from public.orders
    where user_id = v_user and order_number = v_order_number
    limit 1;
    return v_existing_order;
  end if;

  for v_item in
    select ci.id, ci.product_id, ci.quantity, ci.unit_price, p.active, p.name
    from public.cart_items ci
    join public.products p on p.id = ci.product_id
    where ci.cart_id = v_cart
    order by ci.id
    for update
  loop
    if not v_item.active then
      raise exception 'PRODUCT_INACTIVE:%', v_item.product_id;
    end if;

    if v_item.quantity <= 0 then
      raise exception 'INVALID_QUANTITY:%', v_item.product_id;
    end if;

    select id, quantity_on_hand, quantity_reserved
      into v_inventory_id, v_on_hand, v_reserved
      from public.inventory_items
     where product_id = v_item.product_id
       and status = 'active'
     for update;

    if v_inventory_id is null then
      raise exception 'INVENTORY_NOT_CONFIGURED:%', v_item.product_id;
    end if;

    if v_on_hand - v_reserved < v_item.quantity then
      raise exception 'INSUFFICIENT_STOCK:%', v_item.product_id;
    end if;

    v_subtotal := v_subtotal + (v_item.quantity * v_item.unit_price);
  end loop;

  if v_subtotal <= 0 then
    raise exception 'CART_EMPTY';
  end if;

  insert into public.orders(
    user_id, cart_id, order_number, status, currency,
    subtotal, shipping_amount, total_amount, shipping_address
  )
  values(
    v_user, v_cart, v_order_number, 'pending', v_currency,
    v_subtotal, 0, v_subtotal, p_shipping_address
  )
  returning id into v_order;

  for v_item in
    select ci.product_id, ci.quantity, ci.unit_price
    from public.cart_items ci
    where ci.cart_id = v_cart
    order by ci.id
  loop
    insert into public.order_items(
      order_id, product_id, quantity, unit_price, line_total
    )
    values(
      v_order,
      v_item.product_id,
      v_item.quantity,
      v_item.unit_price,
      v_item.quantity * v_item.unit_price
    );

    update public.inventory_items
       set quantity_reserved = quantity_reserved + v_item.quantity,
           updated_at = now()
     where product_id = v_item.product_id;

    insert into public.inventory_movements(
      inventory_item_id, movement_type, quantity,
      reference_type, reference_id, actor_id, note
    )
    select
      id, 'reserve', v_item.quantity,
      'order', v_order::text, v_user,
      'Reserved at checkout'
    from public.inventory_items
    where product_id = v_item.product_id;
  end loop;

  insert into public.invoices(
    invoice_number, customer_id, source_type, source_id,
    currency, subtotal, tax_amount, total_amount, status
  )
  values(
    'INV-' || upper(substr(replace(v_order::text,'-',''),1,12)),
    v_user,
    'order',
    v_order::text,
    v_currency,
    v_subtotal,
    0,
    v_subtotal,
    'issued'
  );

  update public.carts
     set status = 'converted',
         updated_at = now()
   where id = v_cart;

  return v_order;
end;
$function$;

revoke all on function public.checkout_active_cart(text, jsonb) from public;
revoke all on function public.checkout_active_cart(text, jsonb) from anon;
grant execute on function public.checkout_active_cart(text, jsonb) to authenticated;

revoke all on function public.create_service_request(text, uuid, text, timestamptz) from public;
revoke all on function public.create_service_request(text, uuid, text, timestamptz) from anon;
grant execute on function public.create_service_request(text, uuid, text, timestamptz) to authenticated;
