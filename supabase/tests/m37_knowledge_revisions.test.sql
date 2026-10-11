begin;
select plan(5);
select has_table('public', 'knowledge_article_revisions', 'Editorial revisions are persisted');
select has_column('public', 'knowledge_articles', 'source_title', 'Knowledge entries retain a source title');
select has_column('public', 'knowledge_articles', 'source_url', 'Knowledge entries retain a source URL');
select ok(exists (
  select 1 from pg_policies
  where schemaname = 'public' and tablename = 'knowledge_article_revisions' and policyname = 'knowledge_article_revisions_admin_read'
), 'Only super admins can read revision history');
select has_index('public', 'knowledge_article_revisions', 'knowledge_article_revisions_article_idx', 'Revision history is indexed by article and revision number');
select * from finish();
rollback;
