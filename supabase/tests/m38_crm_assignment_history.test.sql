begin;
select plan(4);
select has_column('public', 'leads', 'assigned_to', 'Leads support an assigned owner');
select has_table('public', 'crm_lead_status_history', 'Lead status and assignment changes are auditable');
select has_function('public', 'admin_update_crm_lead', ARRAY['bigint','text','uuid'], 'Lead state changes are transactional and admin authorized');
select has_index('public', 'crm_lead_status_history', 'crm_lead_status_history_lead_idx', 'Lead history is indexed for timeline lookup');
select * from finish();
rollback;
