-- M17: the state-machine transaction must perform its guarded write atomically.
-- SECURITY INVOKER could pass validation but be blocked by the admin-only UPDATE policy,
-- leaving the request unchanged while writing a misleading workflow event.
create or replace function public.transition_service_request(
  p_request_id uuid,
  p_to_status text,
  p_note text default ''
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user uuid := auth.uid();
  v_from text;
  v_customer uuid;
  v_is_super_admin boolean;
  v_transition_allowed boolean := false;
  v_updated integer := 0;
  v_note text := coalesce(p_note, '');
begin
  if v_user is null then
    raise exception 'AUTH_REQUIRED';
  end if;
  if p_request_id is null or p_to_status is null or length(v_note) > 2000 then
    raise exception 'INVALID_TRANSITION';
  end if;

  select r.status, r.customer_id
    into v_from, v_customer
    from public.service_requests r
   where r.id = p_request_id
   for update;

  if not found then
    raise exception 'REQUEST_NOT_FOUND';
  end if;

  v_is_super_admin := private.is_super_admin(v_user);
  if v_customer <> v_user and not v_is_super_admin then
    raise exception 'FORBIDDEN';
  end if;

  if p_to_status not in (
    'submitted','reviewing','quoted','accepted','scheduled',
    'in_progress','completed','cancelled','rejected'
  ) then
    raise exception 'INVALID_STATUS';
  end if;

  if p_to_status = v_from then
    raise exception 'NO_OP_TRANSITION';
  end if;

  v_transition_allowed := case v_from
    when 'submitted' then p_to_status in ('reviewing','cancelled')
    when 'reviewing' then p_to_status in ('quoted','rejected','cancelled')
    when 'quoted' then p_to_status in ('accepted','rejected','cancelled')
    when 'accepted' then p_to_status in ('scheduled','cancelled')
    when 'scheduled' then p_to_status in ('in_progress','cancelled')
    when 'in_progress' then p_to_status in ('completed','cancelled')
    else false
  end;

  if not v_transition_allowed then
    raise exception 'INVALID_TRANSITION';
  end if;

  if not v_is_super_admin and not (
    (v_from = 'submitted' and p_to_status = 'cancelled')
    or (v_from = 'quoted' and p_to_status = 'accepted')
    or (v_from = 'accepted' and p_to_status = 'cancelled')
    or (v_from = 'scheduled' and p_to_status = 'cancelled')
  ) then
    raise exception 'FORBIDDEN';
  end if;

  update public.service_requests
     set status = p_to_status,
         updated_at = now()
   where id = p_request_id
     and status = v_from;
  get diagnostics v_updated = row_count;
  if v_updated <> 1 then
    raise exception 'CONCURRENT_TRANSITION';
  end if;

  insert into public.service_workflow(
    request_id, from_status, to_status, actor_id, note
  ) values (
    p_request_id, v_from, p_to_status, v_user, v_note
  );
end;
$function$;

revoke all on function public.transition_service_request(uuid,text,text) from public, anon;
grant execute on function public.transition_service_request(uuid,text,text) to authenticated;
