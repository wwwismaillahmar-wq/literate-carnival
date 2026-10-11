-- M40: require a recorded provider transaction reference for live-mode settlements.
-- This is still a manual verification workflow until a provider-specific signed callback adapter is configured.
create or replace function public.admin_mark_payment_paid(p_payment_id uuid, p_provider_reference text)
returns table(payment_id uuid, invoice_id uuid, status text)
language plpgsql
security definer
set search_path = public, private
as $function$
declare
  v_payment public.payments%rowtype;
  v_invoice public.invoices%rowtype;
  v_now timestamptz := now();
  v_reference text := nullif(btrim(coalesce(p_provider_reference, '')), '');
  v_live_mode boolean := false;
begin
  if auth.uid() is null or not private.is_super_admin(auth.uid()) then
    raise exception 'FORBIDDEN';
  end if;

  select * into v_payment from public.payments where id = p_payment_id for update;
  if not found then raise exception 'PAYMENT_NOT_FOUND'; end if;

  select * into v_invoice from public.invoices where id = v_payment.invoice_id for update;
  if not found then raise exception 'INVOICE_NOT_FOUND'; end if;

  if v_payment.payer_id is distinct from v_invoice.customer_id
     or v_payment.amount is distinct from v_invoice.total_amount
     or v_payment.currency is distinct from v_invoice.currency then
    raise exception 'PAYMENT_INVOICE_MISMATCH';
  end if;

  if v_payment.status = 'paid' then
    if v_reference is not null and v_payment.provider_reference is distinct from v_reference then
      raise exception 'PAYMENT_ALREADY_SETTLED_REFERENCE_MISMATCH';
    end if;
    return query select v_payment.id, v_invoice.id, 'paid'::text;
    return;
  end if;

  if v_payment.status in ('refunded','failed') then
    raise exception 'PAYMENT_NOT_SETTLEABLE';
  end if;

  select coalesce(bool_or(c.mode = 'live'), false) into v_live_mode
  from public.payment_provider_configs c
  where c.provider_key = v_payment.provider and c.enabled = true;

  if v_live_mode and v_reference is null then
    raise exception 'PAYMENT_REFERENCE_REQUIRED';
  end if;

  update public.payments
     set status = 'paid',
         provider_reference = coalesce(v_reference, provider_reference),
         paid_at = coalesce(paid_at, v_now)
   where id = v_payment.id;

  update public.invoices
     set status = 'paid', paid_at = coalesce(paid_at, v_now)
   where id = v_invoice.id;

  return query select v_payment.id, v_invoice.id, 'paid'::text;
end;
$function$;

create or replace function public.admin_mark_payment_paid(p_payment_id uuid)
returns table(payment_id uuid, invoice_id uuid, status text)
language sql
security definer
set search_path = public, private
as $function$
  select * from public.admin_mark_payment_paid(p_payment_id, null::text);
$function$;

revoke all on function public.admin_mark_payment_paid(uuid) from public, anon;
revoke all on function public.admin_mark_payment_paid(uuid,text) from public, anon;
grant execute on function public.admin_mark_payment_paid(uuid) to authenticated;
grant execute on function public.admin_mark_payment_paid(uuid,text) to authenticated;

-- A new clean installation must not advertise unconfigured live transfer methods.
update public.payment_provider_configs
set enabled = false, updated_at = now()
where provider_key in ('baridimob','edahabia')
  and coalesce(config_data->>'instructions','') = '';
