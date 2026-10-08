import { listMyServiceRequests, listServices } from '@/domains/services/service';
import { createServiceRequest } from './actions';

type ServiceRequestRow = {
  id: string;
  request_number: string;
  status: string;
  description: string;
  services: { name: string }[] | null;
};

export default async function RequestsPage() {
  const [rows, services] = await Promise.all([
    listMyServiceRequests() as Promise<ServiceRequestRow[]>,
    listServices(),
  ]);
  return (
    <main className="section">
      <div className="wrap">
        <span className="kicker">M16 / REQUESTS</span>
        <h1>طلبات الخدمة</h1>
        <section className="card" style={{marginBottom:24}}>
          <h2>إنشاء طلب خدمة</h2>
          <form action={createServiceRequest} style={{display:'grid',gap:10}}>
            <select name="service_id" required><option value="">اختر الخدمة</option>{services.map((service:any)=><option key={service.id} value={service.id}>{service.name}</option>)}</select>
            <textarea name="description" required rows={5} placeholder="اشرح الخدمة المطلوبة بالتفصيل"/>
            <input name="preferred_at" type="datetime-local"/>
            <button type="submit">إرسال طلب الخدمة</button>
          </form>
        </section>
        <div className="grid">
          {rows.map((x) => (
            <article className="card" key={x.id}>
              <h2>{x.request_number}</h2>
              <p>{x.services?.[0]?.name ?? 'خدمة'} · {x.status}</p>
              <p>{x.description}</p>
            </article>
          ))}
          {!rows.length && <article className="card"><p>لا توجد طلبات خدمة بعد.</p></article>}
        </div>
      </div>
    </main>
  );
}
