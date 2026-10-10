begin;
select plan(10);

select has_table('public', 'academy_admission_questions', 'Course admission screening questions are persisted');
select has_table('public', 'academy_admission_applications', 'Admission applications are persisted separately from enrollment');
select has_column('public', 'academy_admission_questions', 'question_type', 'Screening questions declare their response type');
select has_column('public', 'academy_admission_questions', 'active', 'Screening questions can be enabled or disabled');
select has_column('public', 'academy_admission_applications', 'screening_version', 'Applications preserve the screening version used');
select has_column('public', 'academy_admission_applications', 'consent_at', 'Applications record explicit consent time');
select has_column('public', 'academy_admission_applications', 'reviewer_id', 'Admission decisions record the reviewer');
select ok(exists (
  select 1 from pg_policies
  where schemaname = 'public' and tablename = 'academy_admission_questions' and policyname = 'academy_admission_questions_public_active'
), 'Only active questions are public');
select ok(exists (
  select 1 from pg_policies
  where schemaname = 'public' and tablename = 'academy_admission_applications' and policyname = 'academy_admission_applications_public_submit'
), 'Public intake can only create a fresh submitted application');
select ok(exists (
  select 1 from pg_policies
  where schemaname = 'public' and tablename = 'academy_admission_applications' and policyname = 'academy_admission_applications_admin_update'
), 'Only super admins can update admission decisions');

select * from finish();
rollback;
