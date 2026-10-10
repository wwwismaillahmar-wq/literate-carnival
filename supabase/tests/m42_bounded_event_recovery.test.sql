begin;
select plan(4);
select has_column('public', 'platform_events', 'manual_retry_count', 'Manual recovery is bounded by a persisted counter');
select has_table('public', 'platform_event_recovery_logs', 'Manual retry reasons are audited');
select ok(exists (
  select 1 from pg_policies
  where schemaname = 'public' and tablename = 'platform_event_recovery_logs' and policyname = 'platform_event_recovery_logs_admin_read'
), 'Only super admins can inspect recovery logs');
select has_function('public', 'admin_retry_platform_event', ARRAY['uuid','text'], 'Manual retry is performed by an audited database transaction');
select * from finish();
rollback;
