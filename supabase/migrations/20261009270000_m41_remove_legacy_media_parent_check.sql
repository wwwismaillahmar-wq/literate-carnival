-- M41: remove the obsolete M03 parent check superseded by M06's four-parent invariant.
-- The old check only allowed post/contribution assets and silently blocked product/message attachments.
alter table public.media_assets drop constraint if exists media_one_parent;
