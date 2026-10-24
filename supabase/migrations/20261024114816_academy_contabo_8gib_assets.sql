-- File bytes are stored on Contabo. This migration changes lesson metadata only.
-- Supabase Storage bucket limits and MIME allowlists are deliberately untouched.
alter table public.academy_lesson_assets
  add column storage_backend text not null default 'supabase' check (storage_backend in ('supabase','contabo')),
  add column content_sha256 text check (content_sha256 is null or content_sha256 ~ '^[0-9a-f]{64}$');
alter table public.academy_lesson_assets drop constraint academy_lesson_assets_file_size_check;
alter table public.academy_lesson_assets add constraint academy_lesson_assets_file_size_check
  check (file_size >= 1 and file_size <= case when storage_backend='contabo' then 8589934592::bigint else 52428800::bigint end);
alter table public.academy_lesson_assets drop constraint academy_lesson_assets_mime_type_check;
alter table public.academy_lesson_assets add constraint academy_lesson_assets_mime_type_check
  check ((storage_backend='contabo' and mime_type in ('video/mp4','video/webm','video/quicktime','video/x-m4v','video/x-matroska','video/x-msvideo','audio/mpeg','audio/wav','audio/mp4','audio/aac','audio/ogg','audio/flac','application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','text/plain','application/rtf','application/vnd.oasis.opendocument.text','application/vnd.ms-powerpoint','application/vnd.openxmlformats-officedocument.presentationml.presentation','application/vnd.oasis.opendocument.presentation','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','text/csv','application/vnd.oasis.opendocument.spreadsheet','image/jpeg','image/png','image/webp','image/gif','image/svg+xml','application/json','application/xml','text/html','text/css','text/javascript','application/zip'))
    or (storage_backend='supabase' and mime_type in ('video/mp4','video/webm','application/pdf','application/vnd.openxmlformats-officedocument.presentationml.presentation','application/vnd.openxmlformats-officedocument.wordprocessingml.document','image/jpeg','image/png','image/webp','text/plain')));
alter table public.academy_lesson_assets drop constraint academy_lesson_assets_status_check;
alter table public.academy_lesson_assets add constraint academy_lesson_assets_status_check
  check (status in ('pending','uploaded','ready','archived','rejected'));
create or replace function private.academy_guard_storage_backend()
returns trigger language plpgsql security invoker set search_path=''
as $guard$
begin
  if new.storage_backend is distinct from old.storage_backend then
    raise exception 'ACADEMY_STORAGE_BACKEND_IMMUTABLE';
  end if;
  return new;
end;
$guard$;
revoke all on function private.academy_guard_storage_backend() from public;
create trigger academy_guard_storage_backend before update on public.academy_lesson_assets
for each row execute function private.academy_guard_storage_backend();
