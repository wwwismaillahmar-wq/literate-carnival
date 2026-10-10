begin;
select plan(10);
select has_table('public', 'academy_enrollments', 'Learner enrollment records are persisted');
select has_table('public', 'academy_lesson_progress', 'Lesson progress records are persisted');
select has_column('public', 'academy_enrollments', 'user_id', 'Enrollment ownership is explicit');
select has_column('public', 'academy_enrollments', 'course_id', 'Enrollment points to a course identifier');
select has_column('public', 'academy_enrollments', 'status', 'Enrollment has a controlled lifecycle');
select has_column('public', 'academy_lesson_progress', 'lesson_id', 'Progress references a lesson');
select has_column('public', 'academy_lesson_progress', 'completed_at', 'Completion has a timestamp');
select ok(exists (
  select 1 from pg_policies
  where schemaname = 'public' and tablename = 'academy_enrollments' and policyname = 'academy_enrollments_insert_own'
), 'Learners can enroll only as themselves');
select ok(exists (
  select 1 from pg_policies
  where schemaname = 'public' and tablename = 'academy_lesson_progress' and policyname = 'academy_progress_insert_own'
), 'Progress writes require an owned enrollment');
select ok(exists (
  select 1 from pg_policies
  where schemaname = 'public' and tablename = 'academy_modules' and policyname = 'academy_modules_published_read'
), 'Public curriculum reads only published modules');
select * from finish();
rollback;
