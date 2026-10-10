-- M36 behavioral acceptance: private bucket, owner isolation, upload confirmation and admin-only review.
begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

select ok(exists (
  select 1 from storage.buckets
  where id = 'aslan-private-documents' and public = false and file_size_limit = 10485760
), 'partner identity documents use a private bucket capped at 10 MiB');

select has_column('public', 'partner_identity_documents', 'upload_status',
  'document metadata distinguishes pending and confirmed uploads');
select has_column('public', 'partner_identity_documents', 'uploaded_at',
  'confirmed uploads record a timestamp');
select has_function('public', 'complete_partner_identity_document', ARRAY['uuid'],
  'upload completion checks for a real storage object');
select has_function('public', 'admin_review_partner_identity_document', ARRAY['uuid','text','text'],
  'document review is an explicit authorized transition');
select has_function('public', 'admin_review_partner_identity_profile', ARRAY['uuid','text','text'],
  'identity profile review is an explicit authorized transition');

select ok(exists (
  select 1 from pg_policies
  where schemaname = 'storage' and tablename = 'objects'
    and policyname = 'partner_private_documents_owner_insert'
), 'private object upload policy is installed');

create temporary table m36_document_test_ids (
  owner_id uuid not null,
  profile_id uuid not null,
  document_id uuid not null
);
insert into m36_document_test_ids values (gen_random_uuid(), gen_random_uuid(), gen_random_uuid());

insert into auth.users(id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
select owner_id,'authenticated','authenticated',owner_id::text||'@m36-doc.test','',now(),
       '{"provider":"email","providers":["email"]}'::jsonb,'{"full_name":"M36 Document Owner"}'::jsonb,now(),now()
from m36_document_test_ids;

insert into public.partner_identity_profiles(id,user_id,subject_type,legal_name,country_code,consent_at,review_status)
select profile_id,owner_id,'individual','M36 Document Owner','DZ',now(),'pending'
from m36_document_test_ids;

insert into public.partner_identity_documents(
  id,identity_profile_id,owner_id,document_type,storage_bucket,object_path,mime_type,file_size_bytes,review_status,upload_status
)
select document_id,profile_id,owner_id,'identity_card','aslan-private-documents',
       owner_id::text||'/'||document_id::text||'/original','application/pdf',1024,'pending','pending'
from m36_document_test_ids;

grant select on m36_document_test_ids to authenticated;
select set_config('request.jwt.claim.sub',(select owner_id::text from m36_document_test_ids),true);
set local role authenticated;

select throws_ok(
  $q$select * from public.complete_partner_identity_document((select document_id from m36_document_test_ids))$q$,
  'P0001','DOCUMENT_OBJECT_MISSING',
  'owner cannot mark a document uploaded before the object exists in private storage');

select is(
  (select upload_status from public.partner_identity_documents where id=(select document_id from m36_document_test_ids)),
  'pending',
  'failed completion leaves persisted upload state pending');

select throws_ok(
  $q$select * from public.admin_review_partner_identity_document((select document_id from m36_document_test_ids),'verified','')$q$,
  'P0001','FORBIDDEN',
  'ordinary document owner cannot approve their own identity evidence');

select throws_ok(
  $q$select * from public.admin_review_partner_identity_profile((select profile_id from m36_document_test_ids),'verified','')$q$,
  'P0001','FORBIDDEN',
  'identity owner cannot approve their own identity profile');
select is(
  (select review_status from public.partner_identity_profiles where id=(select profile_id from m36_document_test_ids)),
  'pending',
  'unauthorized profile review leaves identity status unchanged');

reset role;
select * from finish();
rollback;
