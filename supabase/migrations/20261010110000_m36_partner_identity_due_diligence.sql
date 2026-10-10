-- M36: private identity due-diligence records for individual and organization partners.
-- Document bytes belong in a private storage bucket; never expose object URLs publicly.
create table if not exists public.partner_identity_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  subject_type text not null check (subject_type in ('individual','organization')),
  organization_id uuid references public.organizations(id) on delete cascade,
  legal_name text not null check (length(legal_name) between 2 and 220),
  country_code text not null check (length(country_code) between 2 and 3),
  contact_email text not null default '' check (length(contact_email) <= 254),
  contact_phone text not null default '' check (length(contact_phone) <= 30),
  date_of_birth date,
  nationality text not null default '' check (length(nationality) <= 100),
  identity_document_type text not null default '' check (length(identity_document_type) <= 80),
  identity_document_number text not null default '' check (length(identity_document_number) <= 120),
  issuing_authority text not null default '' check (length(issuing_authority) <= 180),
  document_issue_date date,
  document_expiry_date date,
  legal_form text not null default '' check (length(legal_form) <= 100),
  registration_number text not null default '' check (length(registration_number) <= 160),
  tax_identifier text not null default '' check (length(tax_identifier) <= 160),
  registered_address text not null default '' check (length(registered_address) <= 500),
  representative_name text not null default '' check (length(representative_name) <= 220),
  representative_role text not null default '' check (length(representative_role) <= 160),
  consent_at timestamptz not null,
  review_status text not null default 'pending' check (review_status in ('pending','needs_information','verified','rejected','expired')),
  reviewer_id uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  review_note text not null default '' check (length(review_note) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((subject_type = 'individual' and user_id is not null and organization_id is null)
      or (subject_type = 'organization' and organization_id is not null)),
  check (contact_email = '' or contact_email = lower(contact_email))
);
create unique index if not exists partner_identity_individual_unique
  on public.partner_identity_profiles(user_id) where subject_type = 'individual';
create unique index if not exists partner_identity_organization_unique
  on public.partner_identity_profiles(organization_id) where subject_type = 'organization';
create index if not exists partner_identity_review_status_idx
  on public.partner_identity_profiles(review_status, updated_at desc);

create table if not exists public.partner_identity_documents (
  id uuid primary key default gen_random_uuid(),
  identity_profile_id uuid not null references public.partner_identity_profiles(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  document_type text not null check (length(document_type) between 2 and 100),
  storage_bucket text not null default 'aslan-private-documents' check (storage_bucket = 'aslan-private-documents'),
  object_path text not null check (length(object_path) between 1 and 700),
  mime_type text not null check (mime_type in ('application/pdf','image/jpeg','image/png','image/webp')),
  file_size_bytes bigint not null check (file_size_bytes between 1 and 10485760),
  issuing_country text not null default '' check (length(issuing_country) <= 100),
  expires_at date,
  review_status text not null default 'pending' check (review_status in ('pending','verified','rejected','expired','needs_information')),
  reviewer_id uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  review_note text not null default '' check (length(review_note) <= 2000),
  created_at timestamptz not null default now(),
  unique(storage_bucket, object_path)
);
create index if not exists partner_identity_documents_owner_idx
  on public.partner_identity_documents(owner_id, created_at desc);
create index if not exists partner_identity_documents_profile_status_idx
  on public.partner_identity_documents(identity_profile_id, review_status);

alter table public.partner_identity_profiles enable row level security;
alter table public.partner_identity_documents enable row level security;

drop policy if exists partner_identity_profiles_owner_select on public.partner_identity_profiles;
create policy partner_identity_profiles_owner_select on public.partner_identity_profiles
  for select to authenticated using (
    user_id = (select auth.uid())
    or (organization_id is not null and exists (
      select 1 from public.organization_members om
      where om.organization_id = partner_identity_profiles.organization_id
        and om.user_id = (select auth.uid()) and om.status = 'active'
    ))
    or (select private.is_super_admin())
  );
drop policy if exists partner_identity_profiles_owner_insert on public.partner_identity_profiles;
create policy partner_identity_profiles_owner_insert on public.partner_identity_profiles
  for insert to authenticated with check (
    review_status = 'pending' and reviewer_id is null and reviewed_at is null
    and consent_at <= now()
    and ((subject_type = 'individual' and user_id = (select auth.uid()) and organization_id is null)
      or (subject_type = 'organization' and organization_id is not null and exists (
        select 1 from public.organization_members om
        where om.organization_id = partner_identity_profiles.organization_id
          and om.user_id = (select auth.uid()) and om.status = 'active'
      )))
  );
drop policy if exists partner_identity_profiles_owner_update on public.partner_identity_profiles;
create policy partner_identity_profiles_owner_update on public.partner_identity_profiles
  for update to authenticated using (
    user_id = (select auth.uid())
    or (organization_id is not null and exists (
      select 1 from public.organization_members om
      where om.organization_id = partner_identity_profiles.organization_id
        and om.user_id = (select auth.uid()) and om.status = 'active'
    ))
  ) with check (
    review_status in ('pending','needs_information','rejected')
    and reviewer_id is null and reviewed_at is null
    and (user_id = (select auth.uid()) or (organization_id is not null and exists (
      select 1 from public.organization_members om
      where om.organization_id = partner_identity_profiles.organization_id
        and om.user_id = (select auth.uid()) and om.status = 'active'
    )))
  );
drop policy if exists partner_identity_profiles_admin_update on public.partner_identity_profiles;
create policy partner_identity_profiles_admin_update on public.partner_identity_profiles
  for update to authenticated using ((select private.is_super_admin()))
  with check ((select private.is_super_admin()));

drop policy if exists partner_identity_documents_owner_select on public.partner_identity_documents;
create policy partner_identity_documents_owner_select on public.partner_identity_documents
  for select to authenticated using (
    owner_id = (select auth.uid()) or (select private.is_super_admin())
    or exists (
      select 1 from public.partner_identity_profiles p
      join public.organization_members om on om.organization_id = p.organization_id
      where p.id = partner_identity_documents.identity_profile_id
        and om.user_id = (select auth.uid()) and om.status = 'active'
    )
  );
drop policy if exists partner_identity_documents_owner_insert on public.partner_identity_documents;
create policy partner_identity_documents_owner_insert on public.partner_identity_documents
  for insert to authenticated with check (
    owner_id = (select auth.uid()) and review_status = 'pending'
    and reviewer_id is null and reviewed_at is null
    and exists (
      select 1 from public.partner_identity_profiles p
      where p.id = identity_profile_id
        and (p.user_id = (select auth.uid()) or exists (
          select 1 from public.organization_members om
          where om.organization_id = p.organization_id
            and om.user_id = (select auth.uid()) and om.status = 'active'
        ))
    )
  );
drop policy if exists partner_identity_documents_admin_update on public.partner_identity_documents;
create policy partner_identity_documents_admin_update on public.partner_identity_documents
  for update to authenticated using ((select private.is_super_admin()))
  with check ((select private.is_super_admin()));

grant select, insert, update on public.partner_identity_profiles to authenticated;
grant select, insert on public.partner_identity_documents to authenticated;
grant update on public.partner_identity_documents to authenticated;
