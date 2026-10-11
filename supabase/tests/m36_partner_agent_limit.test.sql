begin;
select plan(7);
select has_table('public', 'partner_organization_agents', 'Partner organization representatives are modeled explicitly');
select has_column('public', 'partner_organization_agents', 'authority_scope', 'Representative permissions are explicit');
select has_column('public', 'partner_organization_agents', 'affiliation_document_id', 'Representative affiliation can reference reviewed evidence');
select has_column('public', 'partner_organization_agents', 'revoked_at', 'Representative revocation is auditable');
select has_index('public', 'partner_organization_agents', 'partner_org_agents_active_user_unique', 'Duplicate active/pending memberships are prevented');
select has_function('public', 'enforce_partner_agent_limit', array[]::text[], 'The active representative cap is enforced in the database');
select ok(exists (
  select 1 from pg_policies
  where schemaname = 'public' and tablename = 'partner_organization_agents' and policyname = 'partner_org_agents_owner_select'
), 'Representatives are visible only within their organization or to super-admins');
select * from finish();
rollback;
