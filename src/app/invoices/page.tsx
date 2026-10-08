import { listMyInvoices } from '@/domains/billing/service';

type InvoiceRow = {
  id: string;
  invoice_number: string;
  status: string;
  total_amount: number;
  currency: string;
};

export default async function InvoicesPage() {
  const rows = (await listMyInvoices()) as InvoiceRow[];
  return (
    <main className="section">
      <div className="wrap">
        <span className="kicker">M15 / BILLING</span>
        <h1>الفواتير</h1>
        <div className="grid">
          {rows.map((x) => (
            <article className="card" key={x.id}>
              <h2>{x.invoice_number}</h2>
              <p>{x.status} · {x.total_amount} {x.currency}</p>
            </article>
          ))}
          {!rows.length && <article className="card"><p>لا توجد فواتير بعد.</p></article>}
        </div>
      </div>
    </main>
  );
}
