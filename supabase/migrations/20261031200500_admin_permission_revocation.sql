create or replace function public.admin_revoke_permission(target_grant_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
declare existing_grant public.admin_permission_grants%rowtype;
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode='42501';
  end if;
  select * into existing_grant
    from public.admin_permission_grants
    where id = target_grant_id for update;
  if not found then
    raise exception 'grant not found' using errcode='P0002';
  end if;
  if not (
    private.is_super_admin(auth.uid())
    or exists (
      select 1 from public.admin_permission_grants g
      where g.subject_id = auth.uid()
        and g.permission_key = existing_grant.permission_key
        and g.can_delegate
        and (g.expires_at is null or g.expires_at > now())
    )
  ) then
    raise exception 'permission denied' using errcode='42501';
  end if;
  delete from public.admin_permission_grants where id = target_grant_id;
  insert into public.admin_permission_audit(actor_id,subject_id,permission_key,operation)
  values(auth.uid(),existing_grant.subject_id,existing_grant.permission_key,'revoke');
end;
$$;
revoke all on function public.admin_revoke_permission(uuid) from public, anon;
grant execute on function public.admin_revoke_permission(uuid) to authenticated;