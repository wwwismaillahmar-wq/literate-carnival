-- M40: make manual payment confirmation and invoice settlement atomic.
create or replace function public.admin_mark_payment_paid(p_payment_id uuid)
returns table(payment_id uuid, invoice_id uuid, status text)
language plpgsql
security definer
set search_path = public, private
as $function$
declare
  v_payment public.payments%rowtype;
  v_invoice public.invoices%rowtype;
  v_now timestamptz := now();
begin
  if auth.uid() is null or not private.is_super_admin(auth.uid()) then
    raise exception 'FORBIDDEN';
  end if;

  select * into v_payment
    from public.payments
   where id = p_payment_id
   for update;
  if not found then raise exception 'PAYMENT_NOT_FOUND'; end if;

  select * into v_invoice
    from public.invoices
   where id = v_payment.invoice_id
   for update;
  if not found then raise exception 'INVOICE_NOT_FOUND'; end if;

  if v_payment.payer_id is distinct from v_invoice.customer_id
     or v_payment.amount is distinct from v_invoice.total_amount
     or v_payment.currency is distinct from v_invoice.currency then
    raise exception 'PAYMENT_INVOICE_MISMATCH';
  end if;

  if v_payment.status = 'refunded' or v_payment.status = 'failed' then
    raise exception 'PAYMENT_NOT_SETTLEABLE';
  end if;

  update public.payments
     set status = 'paid', paid_at = coalesce(paid_at, v_now)
   where id = v_payment.id;

  update public.invoices
     set status = 'paid', paid_at = coalesce(paid_at, v_now)
   where id = v_invoice.id;

  return query select v_payment.id, v_invoice.id, 'paid'::text;
end;
$function$;

revoke all on function public.admin_mark_payment_paid(uuid) from public;
revoke execute on function public.admin_mark_payment_paid(uuid) from anon;
grant execute on function public.admin_mark_payment_paid(uuid) to authenticated;
