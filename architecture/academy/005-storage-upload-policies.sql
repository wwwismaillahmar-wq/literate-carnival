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

-- Immutable asset identity prevents changing path, size or lesson during confirmation.
create or replace function private.academy_guard_asset_identity()
returns trigger language plpgsql set search_path = '' as $academy_guard$
begin
  if new.id is distinct from old.id
    or new.lesson_id is distinct from old.lesson_id
    or new.owner_id is distinct from old.owner_id
    or new.object_path is distinct from old.object_path
    or new.file_name is distinct from old.file_name
    or new.mime_type is distinct from old.mime_type
    or new.file_size is distinct from old.file_size
    or new.created_at is distinct from old.created_at
  then raise exception 'ACADEMY_ASSET_IMMUTABLE_FIELDS'; end if;
  return new;
end;
$academy_guard$;
drop trigger if exists academy_guard_asset_identity on public.academy_lesson_assets;
create trigger academy_guard_asset_identity before update on public.academy_lesson_assets
for each row execute function private.academy_guard_asset_identity();

-- Allow owner to mark a transferred file uploaded, but never to self-approve it.
-- The API verifies the object exists and its size before making this transition.
drop policy if exists academy_asset_owner_upload_confirmation on public.academy_lesson_assets;
create policy academy_asset_owner_upload_confirmation
on public.academy_lesson_assets for update to authenticated
using (
  owner_id = (select auth.uid())
  and status = 'pending'
  and exists (
    select 1 from public.academy_lessons l
    where l.id = lesson_id and public.can_manage_academy_module(l.module_id)
  )
)
with check (
  owner_id = (select auth.uid())
  and status = 'uploaded'
  and exists (
    select 1 from public.academy_lessons l
    where l.id = lesson_id and public.can_manage_academy_module(l.module_id)
  )
);
-- Review/approval is a separate privileged workflow, not granted here.
-- No client DELETE policy is granted.

-- Super-admin can reject a reviewed upload; approving requires a separate
-- malware/QA attestation workflow and is intentionally not enabled.
drop policy if exists academy_asset_admin_reject on public.academy_lesson_assets;
create policy academy_asset_admin_reject
on public.academy_lesson_assets for update to authenticated
using (public.has_role('super_admin') and status = 'uploaded')
with check (public.has_role('super_admin') and status = 'rejected');
