-- ASLAN Academy 004: pending upload authorization for private Storage.
-- REVIEW AND APPLY AS A CONTROLLED MIGRATION; not applied by GitHub commit.
-- This is required by upload-intent: insert a pending asset before TUS transfer.
alter table public.academy_lesson_assets enable row level security;

drop policy if exists academy_asset_staff_insert_pending on public.academy_lesson_assets;
create policy academy_asset_staff_insert_pending
on public.academy_lesson_assets for insert to authenticated
with check (
  owner_id = (select auth.uid())
  and status = 'pending'
  and file_size > 0
  and file_size <= 52428800
  and object_path like (select auth.uid())::text || '/%'
  and exists (
    select 1 from public.academy_lessons l
    join public.academy_modules m on m.id = l.module_id
    where l.id = lesson_id
      and public.can_manage_academy_module(m.id)
      and object_path like (select auth.uid())::text || '/' || m.course_id::text || '/' || l.id::text || '/%'
  )
);

drop policy if exists academy_asset_staff_select on public.academy_lesson_assets;
create policy academy_asset_staff_select
on public.academy_lesson_assets for select to authenticated
using (
  owner_id = (select auth.uid())
  or exists (
    select 1 from public.academy_lessons l
    where l.id = lesson_id and public.can_manage_academy_module(l.module_id)
  )
  or (status = 'ready' and private.can_access_academy_lesson(lesson_id))
);

-- Deliberately no client UPDATE/DELETE policy: completion and approval
-- require a verified, auditable server-side transition.
