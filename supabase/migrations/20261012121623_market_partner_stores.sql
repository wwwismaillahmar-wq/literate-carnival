-- Current-account role predicate: anon sees false; no access to arbitrary account roles.
create or replace function private.market_admin() returns boolean language sql stable security definer set search_path='' as $fn$
 select auth.uid() is not null and private.is_super_admin(auth.uid());
$fn$;
revoke all on function private.market_admin() from public;
grant usage on schema private to anon,authenticated;
grant execute on function private.market_admin() to anon,authenticated;
-- Partner storefronts and reviewed catalogue submissions. No fabricated stores or products.
create table if not exists public.market_stores (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id),
 name text not null check(char_length(name) between 2 and 160),
 slug text not null unique check(slug ~ '^[a-z0-9][a-z0-9-]{1,79}$' and slug <> 'aslan'),
 description text not null default '' check(char_length(description)<=4000),
 region text not null default '' check(char_length(region)<=120),
 logo_url text not null default '' check(logo_url='' or (logo_url like 'https://%' and char_length(logo_url)<=1500)),
 status text not null default 'submitted' check(status in ('submitted','approved','rejected','suspended')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(owner_id)
);
create index if not exists market_stores_status_idx on public.market_stores(status);
create table if not exists public.market_listing_submissions (
 id uuid primary key default gen_random_uuid(),store_id uuid not null references public.market_stores(id),
 name text not null check(char_length(name) between 2 and 180),
 description text not null default '' check(char_length(description)<=10000),
 price_dzd numeric(12,2) check(price_dzd>=0 and price_dzd<=1000000000),
 stock integer not null default 0 check(stock between 0 and 1000000),
 category_id bigint references public.categories(id),
 images jsonb not null default '[]' check(jsonb_typeof(images)='array' and jsonb_array_length(images)<=8),
 specifications jsonb not null default '{}' check(jsonb_typeof(specifications)='object'),
 minimum_order integer not null default 1 check(minimum_order between 1 and 10000),
 status text not null default 'submitted' check(status in ('submitted','approved','rejected')),
 product_id bigint unique references public.products(id),review_note text not null default '' check(char_length(review_note)<=2000),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create index if not exists market_listing_store_idx on public.market_listing_submissions(store_id,status);
create index if not exists market_listing_category_idx on public.market_listing_submissions(category_id);
create table if not exists public.market_quote_requests (
 id uuid primary key default gen_random_uuid(),customer_id uuid not null references auth.users(id),
 product_id bigint references public.products(id),store_id uuid references public.market_stores(id),
 request_type text not null check(request_type in ('wholesale','custom','availability')),
 quantity integer not null check(quantity between 1 and 1000000),
 contact_name text not null check(char_length(contact_name) between 2 and 160),
 contact_phone text not null check(char_length(contact_phone) between 6 and 30),
 message text not null check(char_length(message) between 10 and 10000),
 status text not null default 'sent' check(status in ('sent','reviewed','answered','closed')),
 reply text not null default '' check(char_length(reply)<=10000),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create index if not exists market_quotes_customer_idx on public.market_quote_requests(customer_id,created_at desc);
create index if not exists market_quotes_store_idx on public.market_quote_requests(store_id,created_at desc);
create index if not exists market_quotes_product_idx on public.market_quote_requests(product_id);
alter table public.market_stores enable row level security;
alter table public.market_listing_submissions enable row level security;
alter table public.market_quote_requests enable row level security;
revoke all on public.market_stores,public.market_listing_submissions,public.market_quote_requests from anon,authenticated;
grant select(id,name,slug,description,region,logo_url,status,created_at,updated_at) on public.market_stores to anon;
grant select,insert,update on public.market_stores to authenticated;
grant select,insert,update on public.market_listing_submissions to authenticated;
grant select,insert on public.market_quote_requests to authenticated;
grant update(status,reply,updated_at) on public.market_quote_requests to authenticated;
drop policy if exists market_store_read on public.market_stores;
create policy market_store_read on public.market_stores for select to anon,authenticated
 using(status='approved' or owner_id=(select auth.uid()) or (select private.market_admin()));
drop policy if exists market_store_insert on public.market_stores;
create policy market_store_insert on public.market_stores for insert to authenticated
 with check((select private.market_admin()) or (owner_id=(select auth.uid()) and status='submitted'));
drop policy if exists market_store_update on public.market_stores;
create policy market_store_update on public.market_stores for update to authenticated
 using((select private.market_admin()) or (owner_id=(select auth.uid()) and status in ('submitted','rejected')))
 with check((select private.market_admin()) or (owner_id=(select auth.uid()) and status='submitted'));
drop policy if exists market_listing_read on public.market_listing_submissions;
create policy market_listing_read on public.market_listing_submissions for select to authenticated
 using((select private.market_admin()) or exists(select 1 from public.market_stores s where s.id=store_id and s.owner_id=(select auth.uid())));
drop policy if exists market_listing_insert on public.market_listing_submissions;
create policy market_listing_insert on public.market_listing_submissions for insert to authenticated
 with check(status='submitted' and product_id is null and review_note='' and exists(select 1 from public.market_stores s where s.id=store_id and s.status='approved' and (s.owner_id=(select auth.uid()) or (select private.market_admin()))));
drop policy if exists market_listing_update on public.market_listing_submissions;
create policy market_listing_update on public.market_listing_submissions for update to authenticated
 using((select private.market_admin()) or (status in ('submitted','rejected') and exists(select 1 from public.market_stores s where s.id=store_id and s.owner_id=(select auth.uid()) and s.status='approved')))
 with check((select private.market_admin()) or (status='submitted' and product_id is null and review_note='' and exists(select 1 from public.market_stores s where s.id=store_id and s.owner_id=(select auth.uid()) and s.status='approved')));
drop policy if exists market_quote_read on public.market_quote_requests;
create policy market_quote_read on public.market_quote_requests for select to authenticated
 using(customer_id=(select auth.uid()) or (select private.market_admin()) or exists(select 1 from public.market_stores s where s.id=store_id and s.owner_id=(select auth.uid()) and s.status='approved'));
drop policy if exists market_quote_insert on public.market_quote_requests;
create policy market_quote_insert on public.market_quote_requests for insert to authenticated
 with check(customer_id=(select auth.uid()) and status='sent' and reply='' and (
  (product_id is null and store_id is null) or exists(
   select 1 from public.products p where p.id=product_id and p.active
    and coalesce(p.features->>'market_store_id','')=coalesce(store_id::text,'')
    and (store_id is null or exists(select 1 from public.market_stores s where s.id=store_id and s.status='approved'))
  )
 ));
drop policy if exists market_quote_update on public.market_quote_requests;
create policy market_quote_update on public.market_quote_requests for update to authenticated
 using((select private.market_admin()) or exists(select 1 from public.market_stores s where s.id=store_id and s.owner_id=(select auth.uid()) and s.status='approved'))
 with check((select private.market_admin()) or exists(select 1 from public.market_stores s where s.id=store_id and s.owner_id=(select auth.uid()) and s.status='approved'));
-- Restrictive policy composes with the existing public active-product policy.
drop policy if exists market_product_store_gate on public.products;
create policy market_product_store_gate on public.products as restrictive for select to anon,authenticated
 using((select private.market_admin()) or coalesce(features->>'market_store_id','')='' or exists(
  select 1 from public.market_stores s where s.id::text=products.features->>'market_store_id' and s.status='approved'));
create or replace function private.market_suspend_products() returns trigger
 language plpgsql security definer set search_path='' as $fn$
begin
 if new.owner_id is distinct from old.owner_id then raise exception 'STORE_OWNER_IMMUTABLE';end if;
 if new.status<>'approved' and old.status='approved' then
  update public.products set active=false where features->>'market_store_id'=new.id::text;
 end if;
 new.updated_at=now();return new;
end;$fn$;
revoke all on function private.market_suspend_products() from public,anon,authenticated;
drop trigger if exists market_store_suspension on public.market_stores;
create trigger market_store_suspension before update on public.market_stores for each row execute function private.market_suspend_products();
-- Admin-only invoker publication locks the request and uses existing admin product/inventory policies.
create or replace function public.market_review_listing(p_id uuid,p_approve boolean,p_note text default '') returns bigint
 language plpgsql security invoker set search_path='' as $fn$
declare item public.market_listing_submissions%rowtype;v_product bigint;
begin
 if auth.uid() is null or not private.market_admin() then raise exception 'ADMIN_REQUIRED';end if;
 if p_approve is null or char_length(coalesce(p_note,''))>2000 then raise exception 'INVALID_REVIEW';end if;
 select * into item from public.market_listing_submissions where id=p_id for update;
 if not found then raise exception 'LISTING_NOT_FOUND';end if;
 if item.status='approved' then return item.product_id;end if;
 if item.status<>'submitted' then raise exception 'LISTING_NOT_SUBMITTED';end if;
 if not p_approve then update public.market_listing_submissions set status='rejected',review_note=coalesce(p_note,''),updated_at=now() where id=p_id;return null;end if;
 perform 1 from public.market_stores where id=item.store_id and status='approved' for share;
 if not found then raise exception 'STORE_NOT_APPROVED';end if;
 insert into public.products(name,slug,description,price_dzd,stock,active,images,features,category_id)
 values(item.name,'partner-'||replace(item.id::text,'-',''),item.description,item.price_dzd,item.stock,true,item.images,
 jsonb_build_object('market_store_id',item.store_id,'minimum_order',item.minimum_order,'specifications',item.specifications),item.category_id)
 returning id into v_product;
 insert into public.inventory_items(product_id,quantity_on_hand,status) values(v_product,item.stock,'active');
 update public.market_listing_submissions set status='approved',product_id=v_product,review_note=coalesce(p_note,''),updated_at=now() where id=p_id;
 return v_product;
end;$fn$;
revoke all on function public.market_review_listing(uuid,boolean,text) from public,anon;
grant execute on function public.market_review_listing(uuid,boolean,text) to authenticated;

create or replace function public.market_add_cart_item(p_product_id bigint,p_quantity integer,p_replace boolean default false) returns uuid
 language plpgsql security invoker set search_path='' as $fn$
declare v_user uuid:=auth.uid();v_cart uuid;v_price numeric;v_stock integer;v_min integer;v_old integer;v_total integer;
begin
 if v_user is null then raise exception 'AUTH_REQUIRED';end if;
 if p_quantity is null or p_quantity<1 or p_quantity>1000000 then raise exception 'INVALID_QUANTITY';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('market-cart:'||v_user::text,0));
 select p.price_dzd,p.stock,case when coalesce(p.features->>'minimum_order','') ~ '^[0-9]{1,5}$' then greatest(1,(p.features->>'minimum_order')::integer) else 1 end
 into v_price,v_stock,v_min from public.products p where p.id=p_product_id and p.active;
 if not found then raise exception 'PRODUCT_NOT_AVAILABLE';end if;
 if v_price is null or v_price<=0 then raise exception 'PRODUCT_PRICE_REQUIRED';end if;
 select id into v_cart from public.carts where user_id=v_user and status='active' for update;
 if v_cart is null then insert into public.carts(user_id) values(v_user) returning id into v_cart;end if;
 select quantity into v_old from public.cart_items where cart_id=v_cart and product_id=p_product_id for update;
 v_total:=case when p_replace then p_quantity else coalesce(v_old,0)+p_quantity end;
 if v_total<v_min then raise exception 'MINIMUM_ORDER_REQUIRED';end if;
 if v_total>v_stock then raise exception 'INSUFFICIENT_STOCK';end if;
 insert into public.cart_items(cart_id,product_id,quantity,unit_price) values(v_cart,p_product_id,v_total,v_price)
 on conflict(cart_id,product_id) do update set quantity=excluded.quantity,unit_price=excluded.unit_price;
 return v_cart;
end;$fn$;
revoke all on function public.market_add_cart_item(bigint,integer,boolean) from public,anon;
grant execute on function public.market_add_cart_item(bigint,integer,boolean) to authenticated;

create or replace function private.market_listing_payload_valid(p_images jsonb,p_specs jsonb) returns boolean
 language sql immutable security invoker set search_path='' as $fn$
 select jsonb_typeof(p_images)='array' and jsonb_array_length(p_images)<=8
  and not exists(select 1 from jsonb_array_elements(p_images) image where jsonb_typeof(image)<>'string' or char_length(image#>>'{}')>1500 or (image#>>'{}')!~'^https://[^/@[:space:]]+(/[^[:space:]]*)?$')
  and jsonb_typeof(p_specs)='object' and (select count(*) from jsonb_each(p_specs))<=20
  and not exists(select 1 from jsonb_each(p_specs) entry where char_length(entry.key)>120 or jsonb_typeof(entry.value)<>'string' or char_length(entry.value#>>'{}')>500);
$fn$;
revoke all on function private.market_listing_payload_valid(jsonb,jsonb) from public,anon;
grant execute on function private.market_listing_payload_valid(jsonb,jsonb) to authenticated;
alter table public.market_listing_submissions drop constraint if exists market_listing_safe_payload;
alter table public.market_listing_submissions add constraint market_listing_safe_payload check(private.market_listing_payload_valid(images,specifications));

-- Validate the declared minimum at both cart write and order creation boundaries.
create or replace function private.market_minimum_quantity_guard() returns trigger
 language plpgsql security invoker set search_path='' as $fn$
declare v_min integer;
begin
 select case when coalesce(features->>'minimum_order','') ~ '^[0-9]{1,5}$' then greatest(1,(features->>'minimum_order')::integer) else 1 end
 into v_min from public.products where id=new.product_id;
 if v_min is not null and new.quantity<v_min then raise exception 'MINIMUM_ORDER_REQUIRED';end if;
 return new;
end;$fn$;
revoke all on function private.market_minimum_quantity_guard() from public,anon,authenticated;
drop trigger if exists market_cart_minimum_guard on public.cart_items;
create trigger market_cart_minimum_guard before insert or update of quantity,product_id on public.cart_items for each row execute function private.market_minimum_quantity_guard();
drop trigger if exists market_order_minimum_guard on public.order_items;
create trigger market_order_minimum_guard before insert on public.order_items for each row execute function private.market_minimum_quantity_guard();

-- Seller sees only their product lines and delivery fields, never other sellers' lines or payment credentials.
create or replace function private.market_seller_orders() returns table(
 order_id uuid,order_number text,order_status text,created_at timestamptz,product_id bigint,product_name text,quantity integer,line_total numeric,delivery jsonb
) language sql stable security definer set search_path='' as $fn$
 select o.id,o.order_number,o.status,o.created_at,oi.product_id,p.name,oi.quantity,oi.line_total,
  jsonb_build_object('recipient_name',o.shipping_address->>'recipient_name','phone',o.shipping_address->>'phone','wilaya',o.shipping_address->>'wilaya','commune',o.shipping_address->>'commune','address',o.shipping_address->>'address')
 from public.orders o join public.order_items oi on oi.order_id=o.id join public.products p on p.id=oi.product_id
 join public.market_stores s on s.id::text=p.features->>'market_store_id'
 where auth.uid() is not null and s.owner_id=auth.uid() and s.status='approved'
 order by o.created_at desc limit 200;
$fn$;
revoke all on function private.market_seller_orders() from public,anon;
grant execute on function private.market_seller_orders() to authenticated;
create or replace function public.market_seller_orders() returns table(
 order_id uuid,order_number text,order_status text,created_at timestamptz,product_id bigint,product_name text,quantity integer,line_total numeric,delivery jsonb
) language sql stable security invoker set search_path='' as $fn$select * from private.market_seller_orders();$fn$;
revoke all on function public.market_seller_orders() from public,anon;
grant execute on function public.market_seller_orders() to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('market-media','market-media',true,3145728,array['image/jpeg','image/png','image/webp'])
 on conflict(id) do nothing;
drop policy if exists market_media_owner_read on storage.objects;
create policy market_media_owner_read on storage.objects for select to authenticated
 using(bucket_id='market-media' and ((storage.foldername(name))[2]=(select auth.uid())::text or (select private.market_admin())));
drop policy if exists market_media_owner_insert on storage.objects;
create policy market_media_owner_insert on storage.objects for insert to authenticated
 with check(bucket_id='market-media' and (storage.foldername(name))[1]='market' and (storage.foldername(name))[2]=(select auth.uid())::text
  and exists(select 1 from public.market_stores where owner_id=(select auth.uid()) and status='approved'));
drop policy if exists market_media_admin_delete on storage.objects;
create policy market_media_admin_delete on storage.objects for delete to authenticated
 using(bucket_id='market-media' and (select private.market_admin()));
create index if not exists products_market_store_idx on public.products((features->>'market_store_id')) where features ? 'market_store_id';
