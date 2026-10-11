-- M07: foundational commerce and service tables.
-- These tables are prerequisites for the M13-M17 checkout, inventory,
-- invoicing, service-request and authorization migrations that follow.
-- Additive CREATE IF NOT EXISTS statements preserve deployed schemas.

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 160),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  description text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists services_active_name_idx on public.services(active, name);

create table if not exists public.service_requests (
  id uuid primary key default gen_random_uuid(),
  request_number text not null unique,
  customer_id uuid not null references auth.users(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete restrict,
  description text not null check (char_length(description) between 5 and 4000),
  preferred_at timestamptz,
  status text not null default 'submitted'
    check (status in ('submitted','reviewing','quoted','accepted','scheduled','in_progress','completed','cancelled','rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists service_requests_customer_created_idx on public.service_requests(customer_id, created_at desc);
create index if not exists service_requests_service_status_idx on public.service_requests(service_id, status, created_at desc);

create table if not exists public.service_quotes (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.service_requests(id) on delete cascade,
  quote_number text not null unique,
  amount numeric(12,2) not null check (amount >= 0),
  currency text not null default 'DZD',
  status text not null default 'draft' check (status in ('draft','sent','accepted','rejected','expired','cancelled')),
  valid_until timestamptz,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists service_quotes_request_created_idx on public.service_quotes(request_id, created_at desc);

create table if not exists public.service_appointments (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.service_requests(id) on delete cascade,
  assigned_to uuid references auth.users(id) on delete set null,
  status text not null default 'scheduled' check (status in ('scheduled','in_progress','completed','cancelled','no_show')),
  starts_at timestamptz not null,
  ends_at timestamptz,
  location text,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or ends_at > starts_at)
);
create index if not exists service_appointments_request_start_idx on public.service_appointments(request_id, starts_at);
create index if not exists service_appointments_assignee_start_idx on public.service_appointments(assigned_to, starts_at);

create table if not exists public.service_workflow (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.service_requests(id) on delete cascade,
  from_status text,
  to_status text not null check (to_status in ('submitted','reviewing','quoted','accepted','scheduled','in_progress','completed','cancelled','rejected')),
  actor_id uuid references auth.users(id) on delete set null,
  note text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists service_workflow_request_created_idx on public.service_workflow(request_id, created_at desc);

create table if not exists public.carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'active' check (status in ('active','converted','abandoned')),
  currency text not null default 'DZD',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists carts_one_active_per_user_idx on public.carts(user_id) where status = 'active';
create index if not exists carts_user_status_updated_idx on public.carts(user_id, status, updated_at desc);

create table if not exists public.cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references public.carts(id) on delete cascade,
  product_id bigint not null references public.products(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cart_id, product_id)
);
create index if not exists cart_items_cart_idx on public.cart_items(cart_id);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  cart_id uuid references public.carts(id) on delete set null,
  order_number text not null unique,
  status text not null default 'pending' check (status in ('pending','processing','confirmed','fulfilled','cancelled','refunded')),
  currency text not null default 'DZD',
  subtotal numeric(12,2) not null default 0 check (subtotal >= 0),
  shipping_amount numeric(12,2) not null default 0 check (shipping_amount >= 0),
  total_amount numeric(12,2) not null default 0 check (total_amount >= 0),
  shipping_address jsonb not null default '{}'::jsonb check (jsonb_typeof(shipping_address) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists orders_one_per_cart_idx on public.orders(cart_id) where cart_id is not null;
create index if not exists orders_user_created_idx on public.orders(user_id, created_at desc);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id bigint not null references public.products(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  line_total numeric(12,2) not null check (line_total >= 0),
  created_at timestamptz not null default now(),
  unique (order_id, product_id)
);
create index if not exists order_items_order_idx on public.order_items(order_id);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null unique,
  customer_id uuid not null references auth.users(id) on delete restrict,
  source_type text not null,
  source_id text not null,
  currency text not null default 'DZD',
  subtotal numeric(12,2) not null default 0 check (subtotal >= 0),
  tax_amount numeric(12,2) not null default 0 check (tax_amount >= 0),
  total_amount numeric(12,2) not null default 0 check (total_amount >= 0),
  status text not null default 'issued' check (status in ('draft','issued','paid','overdue','void','refunded')),
  due_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_type, source_id)
);
create index if not exists invoices_customer_created_idx on public.invoices(customer_id, created_at desc);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete restrict,
  payer_id uuid not null references auth.users(id) on delete restrict,
  provider text not null,
  amount numeric(12,2) not null check (amount >= 0),
  currency text not null default 'DZD',
  status text not null default 'pending' check (status in ('pending','processing','paid','failed','refunded','cancelled')),
  idempotency_key text unique,
  provider_reference text,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists payments_invoice_created_idx on public.payments(invoice_id, created_at desc);

create table if not exists public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  product_id bigint not null unique references public.products(id) on delete restrict,
  sku text unique,
  quantity_on_hand integer not null default 0 check (quantity_on_hand >= 0),
  quantity_reserved integer not null default 0 check (quantity_reserved >= 0),
  reorder_level integer not null default 0 check (reorder_level >= 0),
  status text not null default 'active' check (status in ('active','inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  inventory_item_id uuid not null references public.inventory_items(id) on delete restrict,
  movement_type text not null,
  quantity integer not null check (quantity > 0),
  reference_type text,
  reference_id text,
  actor_id uuid references auth.users(id) on delete set null,
  note text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.fulfillment_tasks (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  assigned_to uuid references auth.users(id) on delete set null,
  status text not null default 'pending' check (status in ('pending','assigned','in_progress','completed','cancelled','failed')),
  note text not null default '',
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.services enable row level security;
alter table public.service_requests enable row level security;
alter table public.service_quotes enable row level security;
alter table public.service_appointments enable row level security;
alter table public.service_workflow enable row level security;
alter table public.carts enable row level security;
alter table public.cart_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.invoices enable row level security;
alter table public.payments enable row level security;
alter table public.inventory_items enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.fulfillment_tasks enable row level security;

grant select on public.services to anon, authenticated;
grant select, insert, update, delete on public.services to authenticated;
grant select, insert, update, delete on public.service_requests, public.service_quotes,
  public.service_appointments, public.service_workflow, public.carts, public.cart_items,
  public.orders, public.order_items, public.invoices, public.payments,
  public.inventory_items, public.inventory_movements, public.fulfillment_tasks
to authenticated;

create or replace function public.create_service_request(
  p_request_number text,
  p_service_id uuid,
  p_description text,
  p_preferred_at timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = public, private
as $function$
declare
  v_user uuid := auth.uid();
  v_request_id uuid;
begin
  if v_user is null then
    raise exception 'AUTH_REQUIRED';
  end if;
  if p_request_number is null or char_length(trim(p_request_number)) < 3 then
    raise exception 'INVALID_REQUEST_NUMBER';
  end if;
  if p_description is null or char_length(trim(p_description)) < 5 or char_length(p_description) > 4000 then
    raise exception 'INVALID_DESCRIPTION';
  end if;
  if not exists (select 1 from public.services where id = p_service_id and active = true) then
    raise exception 'SERVICE_NOT_AVAILABLE';
  end if;

  insert into public.service_requests(request_number, customer_id, service_id, description, preferred_at, status)
  values (trim(p_request_number), v_user, p_service_id, trim(p_description), p_preferred_at, 'submitted')
  returning id into v_request_id;

  insert into public.service_workflow(request_id, from_status, to_status, actor_id, note)
  values (v_request_id, null, 'submitted', v_user, 'Created by customer');

  return v_request_id;
end;
$function$;

revoke all on function public.create_service_request(text, uuid, text, timestamptz) from public, anon;
grant execute on function public.create_service_request(text, uuid, text, timestamptz) to authenticated;
