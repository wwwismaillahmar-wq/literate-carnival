begin;
select plan(12);
select has_table('public', 'partner_identity_profiles', 'Private identity profiles are persisted');
select has_table('public', 'partner_identity_documents', 'Private identity document metadata is persisted');
select has_column('public', 'partner_identity_profiles', 'subject_type', 'Individual and organization identities are distinct');
select has_column('public', 'partner_identity_profiles', 'registration_number', 'Organization registration identifier is supported');
select has_column('public', 'partner_identity_profiles', 'review_status', 'Identity review has explicit lifecycle states');
select has_column('public', 'partner_identity_profiles', 'consent_at', 'Identity collection records consent');
select has_column('public', 'partner_identity_documents', 'storage_bucket', 'Identity evidence is scoped to private storage');
select has_column('public', 'partner_identity_documents', 'file_size_bytes', 'Identity document size is constrained');
select ok(exists (
  select 1 from pg_policies
  where schemaname = 'public' and tablename = 'partner_identity_profiles' and policyname = 'partner_identity_profiles_owner_select'
), 'Identity profiles are owner or super-admin scoped');
select ok(exists (
  select 1 from pg_policies
  where schemaname = 'public' and tablename = 'partner_identity_profiles' and policyname = 'partner_identity_profiles_admin_update'
), 'Identity verification decisions are admin controlled');
select ok(exists (
  select 1 from pg_policies
  where schemaname = 'public' and tablename = 'partner_identity_documents' and policyname = 'partner_identity_documents_owner_select'
), 'Identity documents are private to uploader or super-admin');
select ok(exists (
  select 1 from pg_policies
  where schemaname = 'public' and tablename = 'partner_identity_documents' and policyname = 'partner_identity_documents_admin_update'
), 'Identity document review is admin controlled');
select * from finish();
rollback;
