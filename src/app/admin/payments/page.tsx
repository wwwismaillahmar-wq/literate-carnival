import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { markPaymentPaid } from '../actions';

export const dynamic = 'force-dynamic';

type Payment = { id:string; invoice_id:string; payer_id:string; provider:string; provider_reference:string|null; amount:number; currency:string; status:string; created_at:string; };

export default async function AdminPayments() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/admin/login');
  const { data: isSuperAdmin } = await db.rpc('has_role', { role_key:'super_admin' });
  if (!isSuperAdmin) redirect('/');
  const { data } = await db.from('payments').select('id,invoice_id,payer_id,provider,provider_reference,amount,currency,status,created_at').order('created_at',{ascending:false}).limit(200);
  const rows = (data ?? []) as Payment[];
  return <main className="section"><div className="wrap">
    <Link href="/admin/dashboard">← لوحة التحكم</Link>
    <span className="kicker" style={{display:'block',marginTop:24}}>M15 / PAYMENTS</span>
    <h1>تشغيل المدفوعات</h1>
    <p className="muted">طلبات الدفع الواردة من طرق الدفع المفعلة. التأكيد اليدوي يحدّث الدفع والفاتورة معًا.</p>
    <div className="grid" style={{marginTop:24}}>
      {rows.map(p=><article className="card" key={p.id}>
        <h2>{p.provider}</h2>
        <p>{p.amount} {p.currency} · {p.status}</p>
        <small>Invoice: {p.invoice_id} · Customer: {p.payer_id}</small>
        {p.status !== 'paid' && <form action={markPaymentPaid} style={{marginTop:12}}><input type="hidden" name="payment_id" value={p.id}/><button type="submit">تأكيد استلام الدفع</button></form>}
      </article>)}
      {!rows.length && <article className="card"><p>لا توجد طلبات دفع بعد.</p></article>}
    </div>
  </div></main>;
}