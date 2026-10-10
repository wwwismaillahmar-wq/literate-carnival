-- M36: partner contracts, versioned acceptance, revenue ledger and payout controls.
-- Raw bank/card account numbers are deliberately not stored; payout profiles hold provider tokens and masked values.
create table if not exists public.partner_contracts (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null unique references public.partner_applications(id) on delete restrict,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  owner_id uuid not null references auth.users(id) on delete restrict,
  contract_number text not null unique check (length(contract_number) between 3 and 100),
  title text not null check (length(title) between 2 and 220),
  status text not null default 'proposed' check (status in ('draft','proposed','accepted','active','suspended','terminated','expired')),
  current_version integer not null default 1 check (current_version > 0),
  revenue_share_basis_points integer not null default 0 check (revenue_share_basis_points between 0 and 10000),
  currency text not null default 'DZD' check (currency ~ '^[A-Z]{3}$'),
  effective_at timestamptz,
  expires_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (expires_at is null or effective_at is null or expires_at > effective_at)
);
create index if not exists partner_contracts_owner_status_idx
  on public.partner_contracts(owner_id, status, created_at desc);
create index if not exists partner_contracts_organization_status_idx
  on public.partner_contracts(organization_id, status, created_at desc);

create table if not exists public.partner_contract_versions (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.partner_contracts(id) on delete cascade,
  version_number integer not null check (version_number > 0),
  terms_markdown text not null check (length(terms_markdown) between 20 and 100000),
  terms_hash text not null check (terms_hash ~ '^[a-f0-9]{64}$'),
  status text not null default 'draft' check (status in ('draft','proposed','accepted','rejected','superseded')),
  change_note text not null default '' check (length(change_note) <= 4000),
  created_by uuid references auth.users(id) on delete set null,
  submitted_at timestamptz,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  unique(contract_id, version_number)
);
create index if not exists partner_contract_versions_current_idx
  on public.partner_contract_versions(contract_id, version_number desc, status);

create table if not exists public.partner_contract_signatures (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.partner_contracts(id) on delete cascade,
  version_id uuid not null references public.partner_contract_versions(id) on delete restrict,
  signer_id uuid not null references auth.users(id) on delete restrict,
  signer_name text not null check (length(signer_name) between 2 and 220),
  signer_role text not null check (signer_role in ('partner_owner','super_admin')),
  accepted_terms_hash text not null check (accepted_terms_hash ~ '^[a-f0-9]{64}$'),
  signed_at timestamptz not null default now(),
  unique(version_id, signer_id)
);
create index if not exists partner_contract_signatures_owner_idx
  on public.partner_contract_signatures(signer_id, signed_at desc);

create table if not exists public.partner_payout_profiles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  provider_key text not null check (length(provider_key) between 2 and 80),
  country_code text not null check (country_code ~ '^[A-Z]{2,3}$'),
  account_holder text not null check (length(account_holder) between 2 and 220),
  masked_account text not null check (length(masked_account) between 4 and 80 and masked_account ~ '[*•xX]'),
  provider_account_token text not null check (length(provider_account_token) between 8 and 500),
  status text not null default 'pending' check (status in ('pending','verified','rejected','suspended')),
  review_note text not null default '' check (length(review_note) <= 2000),
  reviewer_id uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_id, provider_key, provider_account_token)
);
create index if not exists partner_payout_profiles_owner_status_idx
  on public.partner_payout_profiles(owner_id, status, created_at desc);

create table if not exists public.partner_revenue_ledger (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete restrict,
  organization_id uuid references public.organizations(id) on delete restrict,
  contract_id uuid references public.partner_contracts(id) on delete restrict,
  source_type text not null check (length(source_type) between 2 and 80),
  source_id text not null check (length(source_id) between 1 and 240),
  direction text not null check (direction in ('credit','debit')),
  amount numeric(14,2) not null check (amount > 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  status text not null default 'pending' check (status in ('pending','approved','paid','reversed')),
  idempotency_key text not null unique check (length(idempotency_key) between 8 and 240),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists partner_revenue_ledger_owner_status_idx
  on public.partner_revenue_ledger(owner_id, status, currency, created_at desc);
create index if not exists partner_revenue_ledger_contract_idx
  on public.partner_revenue_ledger(contract_id, created_at desc);

create table if not exists public.partner_payouts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete restrict,
  payout_profile_id uuid not null references public.partner_payout_profiles(id) on delete restrict,
  amount numeric(14,2) not null check (amount > 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  status text not null default 'requested' check (status in ('requested','approved','processing','paid','rejected','cancelled')),
  provider_reference text,
  idempotency_key text not null check (length(idempotency_key) between 8 and 240),
  review_note text not null default '' check (length(review_note) <= 2000),
  reviewer_id uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_id, idempotency_key)
);
create index if not exists partner_payouts_owner_status_idx
  on public.partner_payouts(owner_id, status, created_at desc);

alter table public.partner_contracts enable row level security;
alter table public.partner_contract_versions enable row level security;
alter table public.partner_contract_signatures enable row level security;
alter table public.partner_payout_profiles enable row level security;
alter table public.partner_revenue_ledger enable row level security;
alter table public.partner_payouts enable row level security;

drop policy if exists partner_contracts_owner_admin_read on public.partner_contracts;
create policy partner_contracts_owner_admin_read on public.partner_contracts
  for select to authenticated using (owner_id = (select auth.uid()) or (select private.is_super_admin()));
drop policy if exists partner_contract_versions_owner_admin_read on public.partner_contract_versions;
create policy partner_contract_versions_owner_admin_read on public.partner_contract_versions
  for select to authenticated using (
    exists (select 1 from public.partner_contracts c where c.id = contract_id
      and (c.owner_id = (select auth.uid()) or (select private.is_super_admin())))
  );
drop policy if exists partner_contract_signatures_owner_admin_read on public.partner_contract_signatures;
create policy partner_contract_signatures_owner_admin_read on public.partner_contract_signatures
  for select to authenticated using (
    signer_id = (select auth.uid()) or exists (
      select 1 from public.partner_contracts c where c.id = contract_id
        and (c.owner_id = (select auth.uid()) or (select private.is_super_admin()))
    )
  );
drop policy if exists partner_payout_profiles_owner_admin_read on public.partner_payout_profiles;
create policy partner_payout_profiles_owner_admin_read on public.partner_payout_profiles
  for select to authenticated using (owner_id = (select auth.uid()) or (select private.is_super_admin()));
drop policy if exists partner_revenue_ledger_owner_admin_read on public.partner_revenue_ledger;
create policy partner_revenue_ledger_owner_admin_read on public.partner_revenue_ledger
  for select to authenticated using (owner_id = (select auth.uid()) or (select private.is_super_admin()));
drop policy if exists partner_payouts_owner_admin_read on public.partner_payouts;
create policy partner_payouts_owner_admin_read on public.partner_payouts
  for select to authenticated using (owner_id = (select auth.uid()) or (select private.is_super_admin()));

grant select on public.partner_contracts, public.partner_contract_versions, public.partner_contract_signatures,
  public.partner_payout_profiles, public.partner_revenue_ledger, public.partner_payouts to authenticated;
revoke insert, update, delete on public.partner_contracts, public.partner_contract_versions,
  public.partner_contract_signatures, public.partner_revenue_ledger, public.partner_payouts from anon, authenticated;
revoke update, delete on public.partner_payout_profiles from anon, authenticated;
grant insert on public.partner_payout_profiles to authenticated;

create or replace function public.admin_create_partner_contract(
  p_application_id uuid,
  p_contract_number text,
  p_title text,
  p_terms_markdown text,
  p_revenue_share_basis_points integer default 0,
  p_currency text default 'DZD'
)
returns table(contract_id uuid, version_id uuid, contract_status text, current_version integer, terms_hash text)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user uuid := auth.uid();
  v_application public.partner_applications%rowtype;
  v_contract public.partner_contracts%rowtype;
  v_version public.partner_contract_versions%rowtype;
  v_hash text;
begin
  if v_user is null or not private.is_super_admin(v_user) then raise exception 'FORBIDDEN'; end if;
  if p_application_id is null or length(btrim(coalesce(p_contract_number,''))) < 3
     or length(btrim(coalesce(p_title,''))) < 2 or length(coalesce(p_terms_markdown,'')) < 20
     or length(p_terms_markdown) > 100000 or p_revenue_share_basis_points not between 0 and 10000
     or p_currency !~ '^[A-Z]{3}$' then raise exception 'INVALID_CONTRACT'; end if;

  select * into v_application from public.partner_applications
   where id = p_application_id and status = 'approved' and organization_id is not null
   for update;
  if not found then raise exception 'APPROVED_PARTNER_APPLICATION_REQUIRED'; end if;
  if exists (select 1 from public.partner_contracts where application_id = p_application_id) then
    raise exception 'CONTRACT_ALREADY_EXISTS';
  end if;

  v_hash := encode(extensions.digest(convert_to(p_terms_markdown,'UTF8'),'sha256'),'hex');
  insert into public.partner_contracts(application_id,organization_id,owner_id,contract_number,title,status,
    current_version,revenue_share_basis_points,currency,created_by)
  values (v_application.id,v_application.organization_id,v_application.owner_id,btrim(p_contract_number),
    btrim(p_title),'proposed',1,p_revenue_share_basis_points,p_currency,v_user)
  returning * into v_contract;

  insert into public.partner_contract_versions(contract_id,version_number,terms_markdown,terms_hash,status,
    change_note,created_by,submitted_at)
  values (v_contract.id,1,p_terms_markdown,v_hash,'proposed','Initial contract proposal',v_user,now())
  returning * into v_version;

  return query select v_contract.id,v_version.id,v_contract.status,v_contract.current_version,v_version.terms_hash;
end;
$function$;

create or replace function public.admin_propose_partner_contract_version(
  p_contract_id uuid,
  p_terms_markdown text,
  p_change_note text default ''
)
returns table(contract_id uuid, version_id uuid, version_number integer, terms_hash text, status text)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user uuid := auth.uid();
  v_contract public.partner_contracts%rowtype;
  v_version public.partner_contract_versions%rowtype;
  v_hash text;
  v_next integer;
begin
  if v_user is null or not private.is_super_admin(v_user) then raise exception 'FORBIDDEN'; end if;
  if p_contract_id is null or length(coalesce(p_terms_markdown,'')) < 20 or length(p_terms_markdown) > 100000
     or length(coalesce(p_change_note,'')) > 4000 then raise exception 'INVALID_CONTRACT_VERSION'; end if;

  select * into v_contract from public.partner_contracts where id = p_contract_id for update;
  if not found then raise exception 'CONTRACT_NOT_FOUND'; end if;
  if v_contract.status not in ('proposed','accepted','suspended') then raise exception 'CONTRACT_NOT_NEGOTIABLE'; end if;

  update public.partner_contract_versions
     set status = 'superseded'
   where contract_id = v_contract.id and status = 'proposed';

  v_next := v_contract.current_version + 1;
  v_hash := encode(extensions.digest(convert_to(p_terms_markdown,'UTF8'),'sha256'),'hex');
  insert into public.partner_contract_versions(contract_id,version_number,terms_markdown,terms_hash,status,
    change_note,created_by,submitted_at)
  values (v_contract.id,v_next,p_terms_markdown,v_hash,'proposed',coalesce(p_change_note,''),v_user,now())
  returning * into v_version;

  update public.partner_contracts set current_version = v_next, status = 'proposed', updated_at = now()
   where id = v_contract.id returning * into v_contract;

  return query select v_contract.id,v_version.id,v_version.version_number,v_version.terms_hash,v_version.status;
end;
$function$;

create or replace function public.partner_accept_contract_version(p_version_id uuid, p_signer_name text)
returns table(contract_id uuid, version_id uuid, contract_status text, signed_at timestamptz, terms_hash text)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user uuid := auth.uid();
  v_contract public.partner_contracts%rowtype;
  v_version public.partner_contract_versions%rowtype;
  v_signature public.partner_contract_signatures%rowtype;
  v_now timestamptz := now();
  v_name text := btrim(coalesce(p_signer_name,''));
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  if length(v_name) < 2 or length(v_name) > 220 then raise exception 'INVALID_SIGNER_NAME'; end if;

  select v.* into v_version from public.partner_contract_versions v where v.id = p_version_id for update;
  if not found then raise exception 'CONTRACT_VERSION_NOT_FOUND'; end if;
  select c.* into v_contract from public.partner_contracts c where c.id = v_version.contract_id for update;
  if not found or v_contract.owner_id <> v_user then raise exception 'FORBIDDEN'; end if;
  if v_version.version_number <> v_contract.current_version or v_version.status not in ('proposed','accepted') then
    raise exception 'CONTRACT_VERSION_NOT_ACCEPTABLE';
  end if;
  if v_version.terms_hash <> encode(extensions.digest(convert_to(v_version.terms_markdown,'UTF8'),'sha256'),'hex') then
    raise exception 'CONTRACT_HASH_MISMATCH';
  end if;

  select s.* into v_signature from public.partner_contract_signatures s
   where s.version_id = v_version.id and s.signer_id = v_user;
  if found then
    return query select v_contract.id,v_version.id,v_contract.status,v_signature.signed_at,v_signature.accepted_terms_hash;
    return;
  end if;

  insert into public.partner_contract_signatures(contract_id,version_id,signer_id,signer_name,signer_role,accepted_terms_hash,signed_at)
  values (v_contract.id,v_version.id,v_user,v_name,'partner_owner',v_version.terms_hash,v_now)
  returning * into v_signature;

  update public.partner_contract_versions set status = 'accepted', accepted_at = v_now
   where id = v_version.id;
  update public.partner_contracts set status = 'accepted', updated_at = v_now where id = v_contract.id
  returning * into v_contract;

  return query select v_contract.id,v_version.id,v_contract.status,v_signature.signed_at,v_signature.accepted_terms_hash;
end;
$function$;

create or replace function public.admin_activate_partner_contract(p_contract_id uuid)
returns table(contract_id uuid, status text, effective_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user uuid := auth.uid();
  v_contract public.partner_contracts%rowtype;
begin
  if v_user is null or not private.is_super_admin(v_user) then raise exception 'FORBIDDEN'; end if;
  select * into v_contract from public.partner_contracts where id = p_contract_id for update;
  if not found then raise exception 'CONTRACT_NOT_FOUND'; end if;
  if v_contract.status <> 'accepted' or not exists (
    select 1 from public.partner_contract_versions v
    join public.partner_contract_signatures s on s.version_id = v.id
    where v.contract_id = v_contract.id and v.version_number = v_contract.current_version
      and v.status = 'accepted' and s.signer_role = 'partner_owner'
      and s.accepted_terms_hash = v.terms_hash
  ) then raise exception 'PARTNER_SIGNATURE_REQUIRED'; end if;

  update public.partner_contracts set status = 'active', effective_at = coalesce(v_contract.effective_at,now()), updated_at = now()
   where id = v_contract.id returning * into v_contract;
  return query select v_contract.id,v_contract.status,v_contract.effective_at;
end;
$function$;

create or replace function public.partner_create_payout_profile(
  p_provider_key text, p_country_code text, p_account_holder text,
  p_masked_account text, p_provider_account_token text
)
returns table(profile_id uuid, status text, masked_account text)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user uuid := auth.uid();
  v_profile public.partner_payout_profiles%rowtype;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  if length(btrim(coalesce(p_provider_key,''))) not between 2 and 80
    or p_country_code !~ '^[A-Z]{2,3}$'
    or length(btrim(coalesce(p_account_holder,''))) not between 2 and 220
    or length(btrim(coalesce(p_masked_account,''))) not between 4 and 80
    or p_masked_account !~ '[*•xX]'
    or length(btrim(coalesce(p_provider_account_token,''))) not between 8 and 500 then
    raise exception 'INVALID_PAYOUT_PROFILE';
  end if;
  insert into public.partner_payout_profiles(owner_id,provider_key,country_code,account_holder,masked_account,provider_account_token,status)
  values (v_user,btrim(p_provider_key),p_country_code,btrim(p_account_holder),btrim(p_masked_account),btrim(p_provider_account_token),'pending')
  on conflict (owner_id,provider_key,provider_account_token) do nothing
  returning * into v_profile;
  if not found then
    select * into v_profile from public.partner_payout_profiles
    where owner_id = v_user and provider_key = btrim(p_provider_key) and provider_account_token = btrim(p_provider_account_token);
  end if;
  return query select v_profile.id,v_profile.status,v_profile.masked_account;
end;
$function$;

create or replace function public.admin_review_partner_payout_profile(
  p_profile_id uuid, p_status text, p_review_note text default ''
)
returns table(profile_id uuid, status text, reviewer_id uuid, reviewed_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user uuid := auth.uid();
  v_profile public.partner_payout_profiles%rowtype;
begin
  if v_user is null or not private.is_super_admin(v_user) then raise exception 'FORBIDDEN'; end if;
  if p_status not in ('verified','rejected','suspended') or length(coalesce(p_review_note,'')) > 2000 then
    raise exception 'INVALID_PAYOUT_PROFILE_REVIEW';
  end if;
  select * into v_profile from public.partner_payout_profiles where id = p_profile_id for update;
  if not found then raise exception 'PAYOUT_PROFILE_NOT_FOUND'; end if;
  update public.partner_payout_profiles set status=p_status, review_note=coalesce(p_review_note,''),
    reviewer_id=v_user, reviewed_at=now(), updated_at=now()
  where id=v_profile.id returning * into v_profile;
  return query select v_profile.id,v_profile.status,v_profile.reviewer_id,v_profile.reviewed_at;
end;
$function$;

create or replace function public.admin_record_partner_earning(
  p_contract_id uuid, p_source_type text, p_source_id text, p_amount numeric,
  p_currency text, p_idempotency_key text
)
returns table(ledger_entry_id uuid, status text, amount numeric, direction text)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user uuid := auth.uid();
  v_contract public.partner_contracts%rowtype;
  v_entry public.partner_revenue_ledger%rowtype;
begin
  if v_user is null or not private.is_super_admin(v_user) then raise exception 'FORBIDDEN'; end if;
  if p_contract_id is null or length(coalesce(p_source_type,'')) not between 2 and 80
    or length(coalesce(p_source_id,'')) not between 1 and 240
    or p_amount is null or p_amount <= 0 or p_currency !~ '^[A-Z]{3}$'
    or length(coalesce(p_idempotency_key,'')) not between 8 and 240 then
    raise exception 'INVALID_PARTNER_EARNING';
  end if;
  select c.* into v_contract from public.partner_contracts c where c.id=p_contract_id and c.status='active' for update;
  if not found then raise exception 'ACTIVE_CONTRACT_REQUIRED'; end if;

  insert into public.partner_revenue_ledger(owner_id,organization_id,contract_id,source_type,source_id,direction,
    amount,currency,status,idempotency_key,created_by)
  values (v_contract.owner_id,v_contract.organization_id,v_contract.id,p_source_type,p_source_id,'credit',
    p_amount,p_currency,'pending',p_idempotency_key,v_user)
  on conflict (idempotency_key) do nothing
  returning * into v_entry;
  if not found then
    select * into v_entry from public.partner_revenue_ledger where idempotency_key=p_idempotency_key;
    if v_entry.contract_id is distinct from v_contract.id or v_entry.amount is distinct from p_amount
      or v_entry.currency is distinct from p_currency or v_entry.source_id is distinct from p_source_id then
      raise exception 'IDEMPOTENCY_KEY_CONFLICT';
    end if;
  end if;
  return query select v_entry.id,v_entry.status,v_entry.amount,v_entry.direction;
end;
$function$;

create or replace function public.admin_review_partner_earning(p_ledger_entry_id uuid, p_status text)
returns table(ledger_entry_id uuid, status text)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user uuid := auth.uid();
  v_entry public.partner_revenue_ledger%rowtype;
begin
  if v_user is null or not private.is_super_admin(v_user) then raise exception 'FORBIDDEN'; end if;
  if p_status not in ('approved','reversed') then raise exception 'INVALID_LEDGER_REVIEW'; end if;
  select * into v_entry from public.partner_revenue_ledger where id=p_ledger_entry_id for update;
  if not found then raise exception 'LEDGER_ENTRY_NOT_FOUND'; end if;
  if v_entry.direction <> 'credit' or v_entry.status <> 'pending' then raise exception 'LEDGER_ENTRY_NOT_REVIEWABLE'; end if;
  update public.partner_revenue_ledger set status=p_status, updated_at=now() where id=v_entry.id returning * into v_entry;
  return query select v_entry.id,v_entry.status;
end;
$function$;

create or replace function public.partner_request_payout(
  p_payout_profile_id uuid, p_amount numeric, p_currency text, p_idempotency_key text
)
returns table(payout_id uuid, status text, amount numeric, currency text, available_after numeric, already_requested boolean)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user uuid := auth.uid();
  v_profile public.partner_payout_profiles%rowtype;
  v_payout public.partner_payouts%rowtype;
  v_earned numeric(14,2);
  v_debited numeric(14,2);
  v_reserved numeric(14,2);
  v_available numeric(14,2);
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_payout_profile_id is null or p_amount is null or p_amount <= 0
    or p_currency !~ '^[A-Z]{3}$' or length(coalesce(p_idempotency_key,'')) not between 8 and 240 then
    raise exception 'INVALID_PAYOUT_REQUEST';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_user::text,0));
  select * into v_payout from public.partner_payouts
   where owner_id=v_user and idempotency_key=p_idempotency_key;
  if found then
    if v_payout.amount is distinct from p_amount or v_payout.currency is distinct from p_currency
      or v_payout.payout_profile_id is distinct from p_payout_profile_id then raise exception 'PAYOUT_IDEMPOTENCY_CONFLICT'; end if;
    select coalesce(sum(case when l.direction='credit' then l.amount else -l.amount end),0) into v_available
      from public.partner_revenue_ledger l where l.owner_id=v_user and l.currency=p_currency and l.status in ('approved','paid');
    select coalesce(sum(p.amount),0) into v_reserved from public.partner_payouts p
      where p.owner_id=v_user and p.currency=p_currency and p.status in ('requested','approved','processing');
    return query select v_payout.id,v_payout.status,v_payout.amount,v_payout.currency,v_available-v_reserved,true;
    return;
  end if;

  select pp.* into v_profile from public.partner_payout_profiles pp
   where pp.id=p_payout_profile_id and pp.owner_id=v_user and pp.status='verified';
  if not found then raise exception 'VERIFIED_PAYOUT_PROFILE_REQUIRED'; end if;

  select coalesce(sum(l.amount),0) into v_earned from public.partner_revenue_ledger l
   where l.owner_id=v_user and l.currency=p_currency and l.direction='credit' and l.status in ('approved','paid');
  select coalesce(sum(l.amount),0) into v_debited from public.partner_revenue_ledger l
   where l.owner_id=v_user and l.currency=p_currency and l.direction='debit' and l.status in ('approved','paid');
  select coalesce(sum(p.amount),0) into v_reserved from public.partner_payouts p
   where p.owner_id=v_user and p.currency=p_currency and p.status in ('requested','approved','processing');
  v_available := v_earned - v_debited - v_reserved;
  if p_amount > v_available then raise exception 'INSUFFICIENT_PARTNER_BALANCE'; end if;

  insert into public.partner_payouts(owner_id,payout_profile_id,amount,currency,status,idempotency_key)
  values (v_user,p_payout_profile_id,p_amount,p_currency,'requested',p_idempotency_key)
  returning * into v_payout;
  return query select v_payout.id,v_payout.status,v_payout.amount,v_payout.currency,v_available-p_amount,false;
end;
$function$;

create or replace function public.admin_review_partner_payout(
  p_payout_id uuid, p_status text, p_provider_reference text default null, p_review_note text default ''
)
returns table(payout_id uuid, status text, provider_reference text, paid_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user uuid := auth.uid();
  v_payout public.partner_payouts%rowtype;
  v_now timestamptz := now();
begin
  if v_user is null or not private.is_super_admin(v_user) then raise exception 'FORBIDDEN'; end if;
  if p_status not in ('approved','processing','paid','rejected','cancelled')
    or length(coalesce(p_review_note,'')) > 2000 then raise exception 'INVALID_PAYOUT_REVIEW'; end if;
  select * into v_payout from public.partner_payouts where id=p_payout_id for update;
  if not found then raise exception 'PAYOUT_NOT_FOUND'; end if;
  if v_payout.status='paid' then
    if p_status='paid' and v_payout.provider_reference is not distinct from nullif(btrim(coalesce(p_provider_reference,'')),'') then
      return query select v_payout.id,v_payout.status,v_payout.provider_reference,v_payout.paid_at;
      return;
    end if;
    raise exception 'PAYOUT_ALREADY_SETTLED';
  end if;
  if not ((v_payout.status='requested' and p_status in ('approved','rejected','cancelled'))
       or (v_payout.status='approved' and p_status in ('processing','rejected','cancelled'))
       or (v_payout.status='processing' and p_status in ('paid','rejected'))) then
    raise exception 'INVALID_PAYOUT_TRANSITION';
  end if;
  if p_status='paid' and length(btrim(coalesce(p_provider_reference,''))) < 3 then
    raise exception 'PAYOUT_PROVIDER_REFERENCE_REQUIRED';
  end if;

  update public.partner_payouts set status=p_status,
    provider_reference=case when p_status='paid' then btrim(p_provider_reference) else v_payout.provider_reference end,
    review_note=coalesce(p_review_note,''), reviewer_id=v_user, reviewed_at=v_now,
    paid_at=case when p_status='paid' then coalesce(paid_at,v_now) else paid_at end, updated_at=v_now
   where id=v_payout.id returning * into v_payout;

  if p_status='paid' then
    insert into public.partner_revenue_ledger(owner_id,contract_id,source_type,source_id,direction,amount,currency,status,idempotency_key,created_by)
    values (v_payout.owner_id,null,'payout',v_payout.id::text,'debit',v_payout.amount,v_payout.currency,'paid',
      'payout:'||v_payout.id::text,v_user)
    on conflict (idempotency_key) do nothing;
  end if;

  return query select v_payout.id,v_payout.status,v_payout.provider_reference,v_payout.paid_at;
end;
$function$;

revoke all on function public.admin_create_partner_contract(uuid,text,text,text,integer,text) from public, anon;
revoke all on function public.admin_propose_partner_contract_version(uuid,text,text) from public, anon;
revoke all on function public.partner_accept_contract_version(uuid,text) from public, anon;
revoke all on function public.admin_activate_partner_contract(uuid) from public, anon;
revoke all on function public.partner_create_payout_profile(text,text,text,text,text) from public, anon;
revoke all on function public.admin_review_partner_payout_profile(uuid,text,text) from public, anon;
revoke all on function public.admin_record_partner_earning(uuid,text,text,numeric,text,text) from public, anon;
revoke all on function public.admin_review_partner_earning(uuid,text) from public, anon;
revoke all on function public.partner_request_payout(uuid,numeric,text,text) from public, anon;
revoke all on function public.admin_review_partner_payout(uuid,text,text,text) from public, anon;

grant execute on function public.admin_create_partner_contract(uuid,text,text,text,integer,text) to authenticated;
grant execute on function public.admin_propose_partner_contract_version(uuid,text,text) to authenticated;
grant execute on function public.partner_accept_contract_version(uuid,text) to authenticated;
grant execute on function public.admin_activate_partner_contract(uuid) to authenticated;
grant execute on function public.partner_create_payout_profile(text,text,text,text,text) to authenticated;
grant execute on function public.admin_review_partner_payout_profile(uuid,text,text) to authenticated;
grant execute on function public.admin_record_partner_earning(uuid,text,text,numeric,text,text) to authenticated;
grant execute on function public.admin_review_partner_earning(uuid,text) to authenticated;
grant execute on function public.partner_request_payout(uuid,numeric,text,text) to authenticated;
grant execute on function public.admin_review_partner_payout(uuid,text,text,text) to authenticated;
