alter table public.media_assets
  add column if not exists upload_status text not null default 'uploaded'
    check (upload_status in ('pending','uploaded','failed'));

alter table public.media_assets
  add column if not exists uploaded_at timestamptz;

update public.media_assets
set uploaded_at = coalesce(uploaded_at, created_at)
where upload_status = 'uploaded' and uploaded_at is null;

create index if not exists media_assets_owner_upload_status_idx
  on public.media_assets(owner_id, upload_status, created_at desc);

-- Restrictive read guard: non-owners cannot see an asset row until upload is confirmed.
drop policy if exists media_upload_completion_guard on public.media_assets;
create policy media_upload_completion_guard on public.media_assets
  as restrictive for select to anon, authenticated
  using (upload_status = 'uploaded' or owner_id = (select auth.uid()));
