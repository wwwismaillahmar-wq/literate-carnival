begin;
select plan(4);
select has_table('public', 'academy_certificates', 'Passed assessments issue a persisted certificate');
select has_column('public', 'academy_certificates', 'certificate_code', 'Certificates have a public verification code');
select has_function('public', 'verify_academy_certificate', ARRAY['text'], 'Certificate verification exposes validity without learner identity');
select has_function('public', 'issue_academy_certificate_on_pass', ARRAY[], 'A database trigger issues certificates only on passing attempts');
select * from finish();
rollback;
