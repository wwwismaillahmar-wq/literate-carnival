-- M08: allow the autonomous worker (service_role) to claim events while keeping
-- authenticated access restricted to Super Admin operators.
create or replace function public.claim_platform_event(p_max_attempts integer default 5)
returns setof public.platform_events
language plpgsql
security definer
set search_path = public
as $function$
begin
  if auth.uid() is not null and not private.is_super_admin(auth.uid()) then
    raise exception 'FORBIDDEN';
  end if;
  return query
  with candidate as (
    select id from public.platform_events
    where status in ('pending','failed')
      and available_at <= now()
      and attempts < greatest(p_max_attempts, 1)
    order by created_at
    for update skip locked
    limit 1
  )
  update public.platform_events e
  set status='processing', attempts=e.attempts+1
  from candidate where e.id=candidate.id
  returning e.*;
end;
$function$;
revoke execute on function public.claim_platform_event(integer) from public, anon, authenticated;
grant execute on function public.claim_platform_event(integer) to service_role;
