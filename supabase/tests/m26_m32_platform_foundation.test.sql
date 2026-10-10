begin;
select plan(16);

select has_table('public', 'notifications', 'M27 uses the established notification inbox');
select has_table('public', 'knowledge_articles', 'M28 knowledge base table exists');
select has_table('public', 'platform_ai_requests', 'M30 AI request audit table exists');
select has_table('public', 'recommendation_events', 'M31 recommendation telemetry exists');
select has_table('public', 'platform_search_events', 'M26 privacy-preserving search telemetry exists');

select has_column('public', 'notifications', 'recipient_id', 'Notifications are scoped to a recipient');
select has_column('public', 'notifications', 'read_at', 'Notification read state is persisted');
select ok(exists (
  select 1 from pg_policies
  where schemaname = 'public' and tablename = 'notifications' and policyname = 'platform_notifications_admin_insert'
), 'Only admins can dispatch notifications through the platform API');
select has_column('public', 'knowledge_articles', 'status', 'Knowledge articles have a publication state');
select has_column('public', 'knowledge_articles', 'published_at', 'Knowledge publication time is persisted');
select has_column('public', 'platform_ai_requests', 'input_hash', 'AI logs store a hash instead of raw input');
select has_column('public', 'platform_ai_requests', 'error_code', 'AI failures have an explicit code');
select has_column('public', 'recommendation_events', 'algorithm_version', 'Recommendation algorithm version is auditable');
select has_column('public', 'platform_search_events', 'query_hash', 'Search logs avoid raw query storage');
select has_column('public', 'platform_search_events', 'filters', 'Search filter metadata is persisted');
select has_index('public', 'notifications', 'notifications_recipient_unread_idx', 'Unread inbox lookup is indexed');

select * from finish();
rollback;
