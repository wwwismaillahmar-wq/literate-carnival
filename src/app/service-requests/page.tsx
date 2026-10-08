import { listMyServiceRequests } from '@/domains/services/service';

type ServiceRequestRow = {
  id: string;
  request_number: string;
  status: string;
  description: string;
  services: { name: string } | null;
};

export default async function RequestsPage() {
  const rows = (await listMyServiceRequests()) as ServiceRequestRow[];
  return (
    <main className="section">
      <div className="wrap">
        <span className="kicker">M16 / REQUESTS</span>
        <h1>طلبات الخدمة</h1>
        <div className="grid">
          {rows.map((x) => (
            <article className="card" key={x.id}>
              <h2>{x.request_number}</h2>
              <p>{x.services?.name ?? 'خدمة'} · {x.status}</p>
              <p>{x.description}</p>
            </article>
          ))}
          {!rows.length && <article className="card"><p>لا توجد طلبات خدمة بعد.</p></article>}
        </div>
      </div>
    </main>
  );
}
