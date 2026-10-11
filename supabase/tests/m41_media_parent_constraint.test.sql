begin;
select plan(1);
select ok(not exists (
  select 1 from pg_constraint
  where conrelid = 'public.media_assets'::regclass and conname = 'media_one_parent'
), 'Obsolete social-only parent constraint no longer blocks product/message media');
select * from finish();
rollback;
