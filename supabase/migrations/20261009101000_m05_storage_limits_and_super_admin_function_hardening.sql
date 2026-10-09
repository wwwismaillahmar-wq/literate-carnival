create or replace function private.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = auth.uid()
      and r.key = 'super_admin'
  );
$function$;

create or replace function private.is_super_admin(target_user uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = target_user
      and r.key = 'super_admin'
  );
$function$;

revoke all on function private.is_super_admin() from public, anon;
revoke all on function private.is_super_admin(uuid) from public, anon;
grant execute on function private.is_super_admin() to authenticated;
grant execute on function private.is_super_admin(uuid) to authenticated;

update storage.buckets
set file_size_limit = 52428800,
    allowed_mime_types = array[
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'video/mp4',
      'video/webm',
      'video/quicktime'
    ]::text[]
where id = 'aslan-media';
