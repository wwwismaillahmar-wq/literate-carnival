begin;
select plan(3);
select has_column('public', 'partner_applications', 'organization_id', 'Approved partner requests can be linked to an organization');
select has_function('public', 'create_partner_organization_on_approval', ARRAY[], 'Partner approval creates an organization and membership atomically');
select has_index('public', 'partner_applications', 'partner_applications_organization_unique', 'An application cannot link duplicate organization records');
select * from finish();
rollback;
