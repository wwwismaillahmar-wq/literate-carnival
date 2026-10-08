import { listMyOrders } from '@/domains/commerce/orders';

type OrderRow = {
  id: string;
  order_number: string;
  status: string;
  total_amount: number;
  currency: string;
};

export default async function OrdersPage() {
  const rows = (await listMyOrders()) as OrderRow[];
  return (
    <main className="section">
      <div className="wrap">
        <span className="kicker">M14 / ORDERS</span>
        <h1>طلباتي</h1>
        <div className="grid">
          {rows.map((o) => (
            <article className="card" key={o.id}>
              <h2>{o.order_number}</h2>
              <p>{o.status} · {o.total_amount} {o.currency}</p>
            </article>
          ))}
          {!rows.length && <article className="card"><p>لا توجد طلبات بعد.</p></article>}
        </div>
      </div>
    </main>
  );
}
