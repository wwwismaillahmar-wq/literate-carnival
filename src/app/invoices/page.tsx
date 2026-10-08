import { listMyInvoices } from '@/domains/billing/service';
import { createClient } from '@/lib/supabase/server';
import { startPayment } from './actions';

type ProviderRow = { provider_key:string; display_name:string; enabled:boolean; mode:string; config_data:Record<string,unknown>|null };

type PaymentRow = { id:string; invoice_id:string; provider:string; amount:number; currency:string; status:string; };

function paymentInstructions(providers: ProviderRow[], providerKey: string) {
  const value = providers.find(p => p.provider_key === providerKey)?.config_data?.instructions;
  return typeof value === 'string' ? value : '';
}

type InvoiceRow = {
  id: string;
  invoice_number: string;
  status: string;
  total_amount: number;
  currency: string;
};

export default async function InvoicesPage({ searchParams }: { searchParams?: Promise<{ error?:string; payment?:string }> }) {
  const rows = (await listMyInvoices()) as InvoiceRow[];
  const params = searchParams ? await searchParams : {};
  const db = await createClient();
  const [{ data: providers }, { data: payments }] = await Promise.all([
    db.from('payment_provider_configs').select('provider_key,display_name,enabled,mode,config_data').eq('enabled',true).order('sort_order').order('display_name'),
    db.from('payments').select('id,invoice_id,provider,amount,currency,status').order('created_at',{ascending:false}),
  ]);
  const activeProviders = (providers ?? []) as ProviderRow[];
  const myPayments = (payments ?? []) as PaymentRow[];
  return (
    <main className="section">
      <div className="wrap">
        <span className="kicker">M15 / BILLING</span>
        <h1>الفواتير</h1>
        {params.error && <article className="card" role="alert" style={{marginBottom:16}}>{params.error}</article>}
        {params.payment && <article className="card" style={{marginBottom:16}}><strong>تم إنشاء طلب الدفع.</strong><p className="muted">اخترت طريقة الدفع ويمكنك متابعة تعليماتها أدناه.</p></article>}
        <div className="grid">
          {rows.map((x) => (
            <article className="card" key={x.id}>
              <h2>{x.invoice_number}</h2>
              <p>{x.status} · {x.total_amount} {x.currency}</p>
              {x.status !== 'paid' && activeProviders.length > 0 && (
                <form action={startPayment} style={{display:'grid',gap:8,marginTop:12}}>
                  <input type="hidden" name="invoice_id" value={x.id}/>
                  <select name="provider" required><option value="">اختر طريقة الدفع</option>{activeProviders.map(p=><option key={p.provider_key} value={p.provider_key}>{p.display_name} {p.mode==='live'?'':'(تجريبي)'}</option>)}</select>
                  <button type="submit">إنشاء طلب دفع</button>
                </form>
              )}
              {myPayments.filter(payment=>payment.invoice_id===x.id).map(payment=><div className="card" key={payment.id} style={{marginTop:10}}>
                <strong>الدفع: {payment.provider}</strong><p>{payment.status} · {payment.amount} {payment.currency}</p>
                {paymentInstructions(activeProviders,payment.provider) && <p className="muted">{paymentInstructions(activeProviders,payment.provider)}</p>}
              </div>)}
            </article>
          ))}
          {!rows.length && <article className="card"><p>لا توجد فواتير بعد.</p></article>}
        </div>
      </div>
    </main>
  );
}
