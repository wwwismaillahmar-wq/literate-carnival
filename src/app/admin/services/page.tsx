import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { transitionServiceRequest } from '../actions';

function nextStatuses(status:string){ const map:Record<string,string[]>={submitted:['reviewing','cancelled'],reviewing:['quoted','rejected','cancelled'],quoted:['accepted','rejected','cancelled'],accepted:['scheduled','cancelled'],scheduled:['in_progress','cancelled'],in_progress:['completed','cancelled']}; return map[status]??[]; }

type RequestRow = {
  id: string;
  request_number: string;
  status: string;
  customer_id: string;
  service_id: string;
  preferred_at: string | null;
  created_at: string;
  services: { name: string }[] | null;
};

export default async function AdminServices() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/admin/login');
  const { data: isSuperAdmin } = await db.rpc('has_role', { role_key: 'super_admin' });
  if (!isSuperAdmin) redirect('/');

  const [r, a, q] = await Promise.all([
    db.from('service_requests').select('id,request_number,status,customer_id,service_id,preferred_at,created_at,services(name)').order('created_at', { ascending: false }).limit(100),
    db.from('service_appointments').select('id,request_id,status,starts_at,ends_at,assigned_to').order('starts_at', { ascending: false }).limit(100),
    db.from('service_quotes').select('id,quote_number,request_id,status,amount,valid_until').order('created_at', { ascending: false }).limit(100),
  ]);
  const requests = (r.data ?? []) as RequestRow[];

  return (
    <main className="section">
      <div className="wrap">
        <span className="kicker">M17 / WORKFLOW</span>
        <h1>تشغيل الخدمات</h1>
        <div className="grid three">
          <article className="card"><h2>Requests</h2><strong>{r.data?.length ?? 0}</strong></article>
          <article className="card"><h2>Quotes</h2><strong>{q.data?.length ?? 0}</strong></article>
          <article className="card"><h2>Appointments</h2><strong>{a.data?.length ?? 0}</strong></article>
        </div>
        <section style={{ marginTop: 32 }}>
          <h2>طلبات الخدمة</h2>
          <div className="grid">
            {requests.map((x) => (
              <article className="card" key={x.id}>
                <h3>{x.request_number}</h3>
                <p>{x.services?.[0]?.name ?? 'خدمة'} · {x.status}</p>
                <small>{x.customer_id}</small>
                <form action={transitionServiceRequest} style={{display:'grid',gap:8,marginTop:12}}>
                  <input type="hidden" name="request_id" value={x.id}/>
                  <select name="to_status" required>
                    {(nextStatuses(x.status)).map(status=><option key={status} value={status}>{status}</option>)}
                  </select>
                  <input name="note" placeholder="ملاحظة التشغيل (اختياري)"/>
                  <button type="submit">تحديث الحالة</button>
                </form>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
