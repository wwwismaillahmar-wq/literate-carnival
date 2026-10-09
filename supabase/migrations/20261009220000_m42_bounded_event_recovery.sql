-- M42: bounded, audited manual recovery for terminally failed platform events.
alter table public.platform_events
  add column if not exists manual_retry_count integer not null default 0
  check (manual_retry_count between 0 and 3);

create table if not exists public.platform_event_recovery_logs (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.platform_events(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  reason text not null check (length(reason) between 5 and 1000),
  previous_attempts integer not null check (previous_attempts >= 0),
  retry_number integer not null check (retry_number between 1 and 3),
  created_at timestamptz not null default now()
);
create index if not exists platform_event_recovery_logs_event_idx
  on public.platform_event_recovery_logs(event_id, created_at desc);
alter table public.platform_event_recovery_logs enable row level security;
drop policy if exists platform_event_recovery_logs_admin_read on public.platform_event_recovery_logs;
create policy platform_event_recovery_logs_admin_read on public.platform_event_recovery_logs
  for select to authenticated using ((select private.is_super_admin()));
grant select on public.platform_event_recovery_logs to authenticated;

create or replace function public.admin_retry_platform_event(p_event_id uuid, p_reason text)
returns table(id uuid, status text, attempts integer, manual_retry_count integer, available_at timestamptz)
language plpgsql
security definer
set search_path = public, private
as $function$
declare
  v_event public.platform_events%rowtype;
  v_next_retry integer;
begin
  if auth.uid() is null or not private.is_super_admin(auth.uid()) then
    raise exception 'FORBIDDEN';
  end if;
  if p_reason is null or length(trim(p_reason)) < 5 or length(trim(p_reason)) > 1000 then
    raise exception 'RETRY_REASON_REQUIRED';
  end if;
  select * into v_event from public.platform_events where platform_events.id = p_event_id for update;
  if not found then raise exception 'EVENT_NOT_FOUND'; end if;
  if v_event.status <> 'failed' then raise exception 'EVENT_NOT_FAILED'; end if;
  if v_event.manual_retry_count >= 3 then raise exception 'MANUAL_RETRY_LIMIT_REACHED'; end if;
  v_next_retry := v_event.manual_retry_count + 1;
  insert into public.platform_event_recovery_logs(event_id, actor_id, reason, previous_attempts, retry_number)
  values(v_event.id, auth.uid(), trim(p_reason), v_event.attempts, v_next_retry);
  update public.platform_events
     set status = 'pending', attempts = 0, available_at = now(),
         manual_retry_count = v_next_retry
   where platform_events.id = v_event.id;
  return query select e.id, e.status, e.attempts, e.manual_retry_count, e.available_at
    from public.platform_events e where e.id = v_event.id;
end;
$function$;
revoke all on function public.admin_retry_platform_event(uuid, text) from public;
revoke execute on function public.admin_retry_platform_event(uuid, text) from anon;
grant execute on function public.admin_retry_platform_event(uuid, text) to authenticated;
