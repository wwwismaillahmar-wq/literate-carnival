-- M04 authorization acceptance tests.
-- Run with: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

create temporary table m04_ids(user1 uuid,user2 uuid,user3 uuid,manager_role uuid,customer_role uuid,super_role uuid,org_id uuid);

insert into m04_ids
select
  max(id) filter (where rn=1),
  max(id) filter (where rn=2),
  max(id) filter (where rn=3),
  (select id from public.roles where key='management'),
  (select id from public.roles where key='customer'),
  (select id from public.roles where key='super_admin'),
  gen_random_uuid()
from (select id,row_number() over(order by created_at) rn from public.profiles limit 3) x;

insert into public.user_roles(user_id,role_id)
select user1,manager_role from m04_ids
on conflict do nothing;

insert into public.organizations(id,name,slug,type)
select org_id,'M04 Test Organization','m04-test-organization','internal' from m04_ids;

insert into public.organization_members(organization_id,user_id,role_id,status)
select org_id,user1,manager_role,'active' from m04_ids;

select ok((select private.has_permission(user1,'organizations.manage') from m04_ids),'manager has global organizations.manage');
select ok((select private.has_permission(user1,'organizations.manage',org_id) from m04_ids),'manager has organization-scoped manage');
select ok((select not private.has_permission(user2,'organizations.manage') from m04_ids),'customer lacks organizations.manage');
select ok((select private.has_permission(user2,'posts.create') from m04_ids),'customer has posts.create');
select ok((select not private.has_permission(user2,'users.manage') from m04_ids),'customer lacks users.manage');

set local role authenticated;
set local request.jwt.claim.sub = (select user2::text from m04_ids);
select is((select count(*)::int from public.organizations where id=(select org_id from m04_ids)),0,'non-member cannot read organization');

set local request.jwt.claim.sub = (select user1::text from m04_ids);
select is((select count(*)::int from public.organizations where id=(select org_id from m04_ids)),1,'organization manager can read organization');
select lives_ok($q$insert into public.organization_members(organization_id,user_id,role_id,status) values ((select org_id from m04_ids),(select user2 from m04_ids),(select customer_role from m04_ids),'active')$q$,'manager can add another member');
select throws_ok($q$insert into public.organization_members(organization_id,user_id,role_id,status) values ((select org_id from m04_ids),(select user1 from m04_ids),(select customer_role from m04_ids),'active')$q$,'42501',null,'member cannot add self');
select throws_ok($q$insert into public.organization_members(organization_id,user_id,role_id,status) values ((select org_id from m04_ids),(select user3 from m04_ids),(select super_role from m04_ids),'active')$q$,'42501',null,'organization manager cannot grant super_admin');
select throws_ok($q$insert into public.user_roles(user_id,role_id) values ((select user2 from m04_ids),(select super_role from m04_ids))$q$,'42501',null,'ordinary member cannot grant global role');

select * from finish();
rollback;
