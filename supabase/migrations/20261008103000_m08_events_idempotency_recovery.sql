-- M08: Events / Idempotency / Retry / Recovery infrastructure.
create table if not exists public.platform_events (
  id uuid primary key default gen_random_uuid(),
  event_name text not null,
  aggregate_type text not null,
  aggregate_id text,
  correlation_id uuid,
  idempotency_key text,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending','processing','processed','failed')),
  attempts integer not null default 0 check (attempts >= 0),
  available_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  last_error text,
  unique(event_name, idempotency_key)
);
create index if not exists platform_events_queue_idx on public.platform_events(status, available_at, created_at);
create index if not exists platform_events_aggregate_idx on public.platform_events(aggregate_type, aggregate_id, created_at desc);

create table if not exists public.idempotency_keys (
  id uuid primary key default gen_random_uuid(),
  scope text not null,
  key text not null,
  request_hash text,
  status text not null default 'processing' check (status in ('processing','completed','failed')),
  response jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz,
  unique(scope, key)
);
create index if not exists idempotency_expiry_idx on public.idempotency_keys(expires_at) where expires_at is not null;

alter table public.platform_events enable row level security;
alter table public.idempotency_keys enable row level security;

drop policy if exists platform_events_admin_all on public.platform_events;
create policy platform_events_admin_all on public.platform_events for all to authenticated using ((select private.is_super_admin())) with check ((select private.is_super_admin()));
drop policy if exists idempotency_admin_all on public.idempotency_keys;
create policy idempotency_admin_all on public.idempotency_keys for all to authenticated using ((select private.is_super_admin())) with check ((select private.is_super_admin()));

create or replace function public.claim_idempotency_key(p_scope text, p_key text, p_request_hash text default null)
returns table(claimed boolean, status text, response jsonb)
language plpgsql
security definer
set search_path = public
as $$
declare r public.idempotency_keys;
begin
  insert into public.idempotency_keys(scope,key,request_hash,status)
  values(p_scope,p_key,p_request_hash,'processing')
  on conflict (scope,key) do nothing
  returning * into r;
  if found then
    return query select true, r.status, r.response;
    return;
  end if;
  select * into r from public.idempotency_keys where scope=p_scope and key=p_key;
  if p_request_hash is not null and r.request_hash is distinct from p_request_hash then
    raise exception 'IDEMPOTENCY_REQUEST_MISMATCH';
  end if;
  return query select false, r.status, r.response;
end;
$$;

create or replace function public.enqueue_platform_event(
  p_event_name text,
  p_aggregate_type text,
  p_aggregate_id text,
  p_correlation_id uuid,
  p_idempotency_key text,
  p_payload jsonb
) returns uuid
language plpgsql security definer set search_path=public
as $$
declare event_id uuid;
begin
  if auth.uid() is null then raise exception 'UNAUTHENTICATED'; end if;
  insert into public.platform_events(event_name,aggregate_type,aggregate_id,correlation_id,idempotency_key,payload)
  values(p_event_name,p_aggregate_type,p_aggregate_id,p_correlation_id,p_idempotency_key,coalesce(p_payload,'{}'::jsonb))
  on conflict (event_name,idempotency_key) do update set event_name=excluded.event_name
  returning id into event_id;
  return event_id;
end;
$$;
revoke all on function public.enqueue_platform_event(text,text,text,uuid,text,jsonb) from public;
grant execute on function public.enqueue_platform_event(text,text,text,uuid,text,jsonb) to authenticated;

create or replace function public.claim_platform_event(p_max_attempts integer default 5)
returns setof public.platform_events
language plpgsql security definer set search_path=public
as $$
begin
  return query
  with candidate as (
    select id from public.platform_events
    where status in ('pending','failed')
      and available_at <= now()
      and attempts < greatest(p_max_attempts,1)
    order by created_at
    for update skip locked
    limit 1
  )
  update public.platform_events e
  set status='processing', attempts=e.attempts+1
  from candidate
  where e.id=candidate.id
  returning e.*;
end;
$$;
revoke all on function public.claim_platform_event(integer) from public;
grant execute on function public.claim_platform_event(integer) to authenticated;
