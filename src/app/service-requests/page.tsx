import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { listMyServiceRequests, listServices } from '@/domains/services/service';
import { createServiceRequest, transitionMyServiceRequest } from './actions';

type ServiceRow = { id: string; name: string; description: string; active: boolean; };
type QuoteRow = { id: string; quote_number: string; amount: number; currency: string; status: string; valid_until: string | null; notes: string; created_at: string };
type AppointmentRow = { id: string; status: string; starts_at: string; ends_at: string | null; location: string | null; notes: string };
type ServiceRequestRow = {
  id: string; request_number: string; status: string; description: string; preferred_at: string | null; created_at: string;
  services: { name: string }[] | null; service_quotes: QuoteRow[]; service_appointments: AppointmentRow[];
};

const labels: Record<string,string> = {
  submitted:'مُرسل', reviewing:'قيد المراجعة', quoted:'عرض سعر جاهز', accepted:'مقبول', scheduled:'مجدول',
  in_progress:'قيد التنفيذ', completed:'مكتمل', cancelled:'ملغى', rejected:'مرفوض',
};

export default async function RequestsPage({ searchParams }: { searchParams?: Promise<{ success?: string; error?: string }> }) {
  const params = searchParams ? await searchParams : {};
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/login?next=/service-requests');

  const [rows, services] = await Promise.all([
    listMyServiceRequests() as Promise<ServiceRequestRow[]>,
    listServices() as Promise<ServiceRow[]>,
  ]);

  return <main className="section"><div className="wrap">
    <div style={{display:'flex',justifyContent:'space-between',gap:12,alignItems:'center',flexWrap:'wrap'}}>
      <div><span className="kicker">M16–M17 / SERVICE PORTAL</span><h1>طلبات الخدمة</h1><p className="muted">أرسل طلبك، تابع عرض السعر، وافق عليه أو ارفضه، ثم تابع موعد التنفيذ.</p></div>
      <Link className="card" href="/services">كتالوج الخدمات</Link>
    </div>
    {params.success && <div className="card" style={{marginTop:16,border:'1px solid #2f855a'}}><strong>✓ {params.success}</strong></div>}
    {params.error && <div className="card" style={{marginTop:16,border:'1px solid #c53030'}}><strong>✕ {params.error}</strong></div>}
    <section className="card" style={{marginTop:24}}>
      <h2>إنشاء طلب خدمة</h2>
      <form action={createServiceRequest} style={{display:'grid',gap:10}}>
        <label>الخدمة المطلوبة<select name="service_id" required defaultValue=""><option value="">اختر الخدمة</option>{services.map((service)=><option key={service.id} value={service.id}>{service.name}</option>)}</select></label>
        <label>وصف الطلب<textarea name="description" required minLength={5} maxLength={4000} rows={5} placeholder="اشرح الخدمة المطلوبة والموقع والتفاصيل المهمة"/></label>
        <label>الوقت المفضل (اختياري)<input name="preferred_at" type="datetime-local"/></label>
        <button type="submit" disabled={!services.length}>إرسال طلب الخدمة</button>
        {!services.length && <p className="muted">لا توجد خدمات نشطة يمكن طلبها حاليًا.</p>}
      </form>
    </section>

    <section style={{marginTop:30}}><h2>طلباتي ({rows.length})</h2><div style={{display:'grid',gap:16,marginTop:14}}>
      {rows.map((request) => {
        const serviceName = request.services?.[0]?.name ?? 'خدمة';
        const quotes = request.service_quotes ?? [];
        const appointments = request.service_appointments ?? [];
        return <article className="card" key={request.id}>
          <div style={{display:'flex',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}><div><span className="kicker">{request.request_number}</span><h3>{serviceName}</h3></div><span className="market-category">{labels[request.status] ?? request.status}</span></div>
          <p>{request.description}</p>
          {request.preferred_at && <p className="muted">الوقت المفضل: {new Date(request.preferred_at).toLocaleString('ar-DZ')}</p>}
          {(request.status === 'quoted' || request.status === 'submitted' || request.status === 'accepted') && <form action={transitionMyServiceRequest} style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:12}}>
            <input type="hidden" name="request_id" value={request.id}/>
            {request.status === 'quoted' && <><button type="submit" name="to_status" value="accepted">قبول عرض السعر</button><button type="submit" name="to_status" value="rejected">رفض العرض</button></>}
            {(request.status === 'submitted' || request.status === 'accepted') && <button type="submit" name="to_status" value="cancelled">إلغاء الطلب</button>}
          </form>}

          <section className="card" style={{marginTop:16}}><h4>عروض الأسعار ({quotes.length})</h4>
            {quotes.map((quote)=><div key={quote.id} style={{padding:'10px 0',borderBottom:'1px solid rgba(255,255,255,.08)'}}>
              <div style={{display:'flex',justifyContent:'space-between',gap:10,flexWrap:'wrap'}}><strong>{quote.quote_number}</strong><strong className="product-price">{quote.amount.toLocaleString('ar-DZ')} {quote.currency}</strong></div>
              <p className="muted">{quote.status}{quote.valid_until ? ' · صالح حتى '+new Date(quote.valid_until).toLocaleDateString('ar-DZ') : ''}</p>
              {quote.notes && <p>{quote.notes}</p>}
            </div>)}
            {!quotes.length && <p className="muted">لم يصدر عرض سعر بعد.</p>}
          </section>

          <section className="card" style={{marginTop:12}}><h4>مواعيد التنفيذ ({appointments.length})</h4>
            {appointments.map((appointment)=><div key={appointment.id} style={{padding:'10px 0',borderBottom:'1px solid rgba(255,255,255,.08)'}}>
              <strong>{new Date(appointment.starts_at).toLocaleString('ar-DZ')} · {labels[appointment.status] ?? appointment.status}</strong>
              <p className="muted">{appointment.ends_at ? 'حتى '+new Date(appointment.ends_at).toLocaleString('ar-DZ') : 'نهاية الموعد غير محددة'} · {appointment.location || 'الموقع قيد التأكيد'}</p>
              {appointment.notes && <p>{appointment.notes}</p>}
            </div>)}
            {!appointments.length && <p className="muted">لم يُحدد موعد بعد.</p>}
          </section>
        </article>;
      })}
      {!rows.length && <article className="card"><p>لا توجد طلبات خدمة حتى الآن.</p></article>}
    </div></section>
  </div></main>;
}
