import { listMyOrders } from '@/domains/commerce/orders';

type OrderRow = {
  id: string;
  order_number: string;
  status: string;
  total_amount: number;
  currency: string;
};

export default async function OrdersPage({ searchParams }: { searchParams?: Promise<{ created?: string }> }) {
  const params = searchParams ? await searchParams : {};
  const rows = (await listMyOrders()) as OrderRow[];
  return (
    <main className="section">
      <div className="wrap">
        <span className="kicker">M14 / ORDERS</span>
        <h1>طلباتي</h1>
        {params.created && <section className="card" role="status" style={{ marginBottom:20 }}><h2>تم إنشاء الطلب</h2><p>مرجع الطلب: {params.created}</p><p className="muted">تم إنشاء الطلب وحجز المخزون. لم يُعتبر الدفع مؤكدًا؛ تابع تعليمات الدفع المعتمدة.</p></section>}
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
