create or replace function public.create_service_quote(
  p_request_id uuid,
  p_quote_number text,
  p_amount numeric,
  p_currency text default 'DZD',
  p_valid_until timestamptz default null,
  p_notes text default ''
)
returns uuid
language plpgsql
security invoker
set search_path = public, private, pg_temp
as $$
declare
  v_request public.service_requests%rowtype;
  v_quote_id uuid;
begin
  if auth.uid() is null or not private.is_super_admin() then
    raise exception 'FORBIDDEN: super admin required';
  end if;
  if p_amount is null or p_amount < 0 then
    raise exception 'INVALID_AMOUNT';
  end if;
  if coalesce(length(trim(p_quote_number)), 0) < 3 then
    raise exception 'INVALID_QUOTE_NUMBER';
  end if;

  select * into v_request
  from public.service_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'SERVICE_REQUEST_NOT_FOUND';
  end if;
  if v_request.status <> 'reviewing' then
    raise exception 'REQUEST_MUST_BE_REVIEWING_TO_ISSUE_QUOTE';
  end if;

  insert into public.service_quotes(request_id, quote_number, amount, currency, status, valid_until, notes)
  values (p_request_id, p_quote_number, p_amount, coalesce(nullif(trim(p_currency), ''), 'DZD'), 'sent', p_valid_until, coalesce(p_notes, ''))
  returning id into v_quote_id;

  update public.service_requests
  set status = 'quoted', updated_at = now()
  where id = p_request_id;

  insert into public.service_workflow(request_id, from_status, to_status, actor_id, note)
  values (p_request_id, v_request.status, 'quoted', auth.uid(), 'تم إصدار عرض السعر ' || p_quote_number);

  return v_quote_id;
end;
$$;

revoke all on function public.create_service_quote(uuid, text, numeric, text, timestamptz, text) from public, anon;
grant execute on function public.create_service_quote(uuid, text, numeric, text, timestamptz, text) to authenticated;

create or replace function public.create_service_appointment(
  p_request_id uuid,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_assigned_to uuid default null,
  p_location text default null,
  p_notes text default ''
)
returns uuid
language plpgsql
security invoker
set search_path = public, private, pg_temp
as $$
declare
  v_request public.service_requests%rowtype;
  v_appointment_id uuid;
begin
  if auth.uid() is null or not private.is_super_admin() then
    raise exception 'FORBIDDEN: super admin required';
  end if;
  if p_starts_at is null or p_ends_at is null or p_ends_at <= p_starts_at then
    raise exception 'INVALID_APPOINTMENT_RANGE';
  end if;

  select * into v_request
  from public.service_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'SERVICE_REQUEST_NOT_FOUND';
  end if;
  if v_request.status not in ('accepted', 'scheduled') then
    raise exception 'REQUEST_MUST_BE_ACCEPTED_BEFORE_SCHEDULING';
  end if;

  if p_assigned_to is not null and exists (
    select 1
    from public.service_appointments a
    where a.assigned_to = p_assigned_to
      and a.status not in ('cancelled', 'completed', 'no_show')
      and a.starts_at < p_ends_at
      and coalesce(a.ends_at, a.starts_at) > p_starts_at
  ) then
    raise exception 'ASSIGNEE_TIME_CONFLICT';
  end if;

  insert into public.service_appointments(request_id, assigned_to, status, starts_at, ends_at, location, notes)
  values (p_request_id, p_assigned_to, 'scheduled', p_starts_at, p_ends_at, p_location, coalesce(p_notes, ''))
  returning id into v_appointment_id;

  if v_request.status = 'accepted' then
    update public.service_requests
    set status = 'scheduled', updated_at = now()
    where id = p_request_id;

    insert into public.service_workflow(request_id, from_status, to_status, actor_id, note)
    values (p_request_id, 'accepted', 'scheduled', auth.uid(), 'تم جدولة موعد الخدمة');
  end if;

  return v_appointment_id;
end;
$$;

revoke all on function public.create_service_appointment(uuid, timestamptz, timestamptz, uuid, text, text) from public, anon;
grant execute on function public.create_service_appointment(uuid, timestamptz, timestamptz, uuid, text, text) to authenticated;
