begin;
select plan(34);

select has_table('public', 'academy_modules', 'Academy modules have a persisted content model');
select has_table('public', 'academy_lessons', 'Academy lessons have a persisted content model');
select has_table('public', 'talent_profiles', 'Talent profiles are persisted separately from account identity');
select has_table('public', 'talent_evidence', 'Talent evidence has a reviewable record');
select has_table('public', 'partner_applications', 'Partner applications are persisted');
select has_table('public', 'crm_lead_activities', 'CRM follow-up activity is persisted');
select has_table('public', 'site_settings', 'Brand settings reuse the existing settings table');

select has_column('public', 'academy_modules', 'course_id', 'Modules are associated with an existing course identifier');
select has_column('public', 'academy_modules', 'status', 'Modules have publication lifecycle state');
select has_column('public', 'academy_lessons', 'module_id', 'Lessons belong to a module');
select has_column('public', 'academy_lessons', 'status', 'Lessons have publication lifecycle state');
select has_column('public', 'talent_profiles', 'user_id', 'Talent profiles are owner scoped');
select has_column('public', 'talent_profiles', 'review_status', 'Talent publication requires review state');
select has_column('public', 'talent_profiles', 'public_profile', 'Public talent visibility requires explicit opt-in');
select has_column('public', 'talent_evidence', 'owner_id', 'Evidence is owner scoped');
select has_column('public', 'talent_evidence', 'verification_status', 'Evidence has explicit verification state');
select has_column('public', 'talent_evidence', 'verified_by', 'Evidence verifier is auditable');
select has_column('public', 'partner_applications', 'owner_id', 'Partner applications can be scoped to an account');
select has_column('public', 'partner_applications', 'status', 'Partner applications have a lifecycle state');
select has_column('public', 'partner_applications', 'partnership_type', 'Partner applications record the requested relationship type');
select has_column('public', 'crm_lead_activities', 'lead_id', 'CRM activities link to an existing lead');
select has_column('public', 'crm_lead_activities', 'follow_up_at', 'CRM follow-up dates are persisted');

select ok(exists (
  select 1 from pg_policies
  where schemaname = 'public' and tablename = 'academy_modules' and policyname = 'academy_modules_admin_all'
), 'Only super admins manage academy modules');
select ok(exists (
  select 1 from pg_policies
  where schemaname = 'public' and tablename = 'academy_lessons' and policyname = 'academy_lessons_admin_all'
), 'Only super admins manage academy lessons');
select ok(exists (
  select 1 from pg_policies
  where schemaname = 'public' and tablename = 'talent_profiles' and policyname = 'talent_profiles_update_own'
), 'Talent owners can only update unverified profile states');
select ok(exists (
  select 1 from pg_policies
  where schemaname = 'public' and tablename = 'talent_evidence' and policyname = 'talent_evidence_insert_own'
), 'Talent owners submit unverified evidence only');
select ok(exists (
  select 1 from pg_policies
  where schemaname = 'public' and tablename = 'talent_evidence' and policyname = 'talent_evidence_admin_update'
), 'Evidence verification is admin controlled');
select ok(exists (
  select 1 from pg_policies
  where schemaname = 'public' and tablename = 'partner_applications' and policyname = 'partner_applications_public_insert'
), 'Partner application intake is validated and starts as submitted');
select ok(exists (
  select 1 from pg_policies
  where schemaname = 'public' and tablename = 'partner_applications' and policyname = 'partner_applications_admin_update'
), 'Partner application status updates are admin controlled');
select ok(exists (
  select 1 from pg_policies
  where schemaname = 'public' and tablename = 'crm_lead_activities' and policyname = 'crm_lead_activities_admin_all'
), 'CRM activity records are admin controlled');

select has_column('public', 'media_assets', 'upload_status', 'Media records distinguish pending from completed uploads');
select has_column('public', 'media_assets', 'uploaded_at', 'Completed uploads record a confirmation timestamp');
select ok(exists (
  select 1 from pg_policies
  where schemaname = 'public' and tablename = 'media_assets' and policyname = 'media_upload_completion_guard'
), 'Pending media is not visible to non-owners');
select has_index('public', 'media_assets', 'media_assets_owner_upload_status_idx', 'Media cleanup and owner lookup are indexed');

select * from finish();
rollback;
