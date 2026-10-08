-- M15 payment provider configuration: provider credentials are runtime data,
-- not hard-coded application constants. Super Admin may enable/disable and replace
-- provider credentials without a code deployment.
create table if not exists public.payment_provider_configs (
  id uuid primary key default gen_random_uuid(),
  provider_key text not null unique,
  display_name text not null,
  enabled boolean not null default false,
  mode text not null default 'sandbox' check (mode in ('sandbox','live')),
  credentials jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.payment_provider_configs enable row level security;

drop policy if exists payment_provider_configs_admin_all on public.payment_provider_configs;
create policy payment_provider_configs_admin_all
  on public.payment_provider_configs
  for all to authenticated
  using ((select private.is_super_admin()))
  with check ((select private.is_super_admin()));

insert into public.payment_provider_configs(provider_key, display_name, enabled, mode)
values
  ('paypal','PayPal',false,'sandbox'),
  ('chargily','Chargily Pay',false,'sandbox'),
  ('baridimob','BaridiMob',true,'live'),
  ('edahabia','Edahabia',true,'live'),
  ('cib','CIB / SATIM',false,'sandbox')
on conflict (provider_key) do nothing;
