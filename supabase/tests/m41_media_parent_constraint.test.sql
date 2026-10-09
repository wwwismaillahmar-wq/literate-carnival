begin;
select plan(1);
select hasnt_constraint('public', 'media_assets', 'media_one_parent', 'Obsolete social-only parent constraint no longer blocks product/message media');
select * from finish();
rollback;
