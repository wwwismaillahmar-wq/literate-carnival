import Link from 'next/link';
import { listServices } from '@/domains/services/service';

type ServiceRow = {
  id: string;
  name: string;
  description: string;
};

export default async function ServicesPage() {
  const rows = (await listServices()) as ServiceRow[];
  return (
    <main className="section">
      <div className="wrap">
        <span className="kicker">M16 / SERVICES</span>
        <h1>الخدمات</h1>
        <p className="muted">اختر الخدمة المناسبة وأرسل طلبًا لمراجعته وتسعيره وجدولة تنفيذه.</p>
        <p className="lead">طلب خدمة → عرض سعر → قبول → فاتورة → دفع → تنفيذ.</p>
        <div className="grid three">
          {rows.map((x) => (
            <article className="card" key={x.id}>
              <h2>{x.name}</h2>
              <p>{x.description}</p>
              <Link className="btn primary" href="/service-requests" style={{width:"100%",marginTop:12}}>طلب هذه الخدمة</Link>
            </article>
          ))}
          {!rows.length && <article className="card"><p>لا توجد خدمات مفعلة بعد.</p></article>}
        </div>
      </div>
    </main>
  );
}
