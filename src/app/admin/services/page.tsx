import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { issueServiceQuote, scheduleServiceAppointment, transitionServiceRequest } from '../actions';

export const dynamic = 'force-dynamic';

type RequestRow = {
  id: string; request_number: string; status: string; customer_id: string; service_id: string;
  description: string; preferred_at: string | null; created_at: string;
  services: { name: string }[] | { name: string } | null;
};
type QuoteRow = { id: string; quote_number: string; request_id: string; status: string; amount: number; currency: string; valid_until: string | null; notes: string; created_at: string };
type AppointmentRow = { id: string; request_id: string; status: string; starts_at: string; ends_at: string | null; assigned_to: string | null; location: string | null; notes: string };
type ProfileRow = { id: string; full_name: string | null; username: string | null };

function nextStatuses(status: string) {
  const map: Record<string, string[]> = {
    submitted: ['reviewing', 'cancelled'],
    reviewing: ['quoted', 'rejected', 'cancelled'],
    quoted: ['accepted', 'rejected', 'cancelled'],
    accepted: ['scheduled', 'cancelled'],
    scheduled: ['in_progress', 'cancelled'],
    in_progress: ['completed', 'cancelled'],
  };
  return map[status] ?? [];
}

export default async function AdminServices({ searchParams }: { searchParams?: Promise<{ success?: string; error?: string }> }) {
  const params = searchParams ? await searchParams : {};
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/admin/login');
  const { data: isSuperAdmin, error: authError } = await db.rpc('has_role', { role_key: 'super_admin' });
  if (authError || isSuperAdmin !== true) redirect('/');

  const [requestsResult, appointmentsResult, quotesResult, profilesResult] = await Promise.all([
    db.from('service_requests').select('id,request_number,status,customer_id,service_id,description,preferred_at,created_at,services(name)').order('created_at', { ascending: false }).limit(200),
    db.from('service_appointments').select('id,request_id,status,starts_at,ends_at,assigned_to,location,notes').order('starts_at', { ascending: false }).limit(200),
    db.from('service_quotes').select('id,quote_number,request_id,status,amount,currency,valid_until,notes,created_at').order('created_at', { ascending: false }).limit(200),
    db.from('profiles').select('id,full_name,username').order('full_name'),
  ]);
  const requests = (requestsResult.data ?? []) as unknown as RequestRow[];
  const appointments = (appointmentsResult.data ?? []) as AppointmentRow[];
  const quotes = (quotesResult.data ?? []) as QuoteRow[];
  const profiles = (profilesResult.data ?? []) as ProfileRow[];

  return <main className="section"><div className="wrap">
    <div style={{display:'flex',justifyContent:'space-between',gap:16,alignItems:'center',flexWrap:'wrap'}}>
      <div><span className="kicker">M16–M17 / SERVICE OPERATIONS</span><h1>تشغيل الخدمات</h1><p className="muted">إدارة الطلبات وعروض الأسعار والمواعيد وسجل الانتقال بين الحالات.</p></div>
      <div style={{display:'flex',gap:8,flexWrap:'wrap'}}><Link className="card" href="/admin/control">بوابة الإدارة</Link><Link className="card" href="/admin/services/catalog">إدارة كتالوج الخدمات</Link><Link className="card" href="/service-requests" target="_blank">معاينة طلبات العميل</Link></div>
    </div>
    {params.success && <div className="card" style={{marginTop:16,border:'1px solid #2f855a'}}><strong>✓ {params.success}</strong></div>}
    {params.error && <div className="card" style={{marginTop:16,border:'1px solid #c53030'}}><strong>✕ {params.error}</strong></div>}
    {(requestsResult.error || appointmentsResult.error || quotesResult.error || profilesResult.error) && <div className="card" style={{marginTop:16,border:'1px solid #c53030'}}><strong>تعذر تحميل جزء من بيانات تشغيل الخدمات.</strong><p className="muted">{[requestsResult.error?.message,appointmentsResult.error?.message,quotesResult.error?.message,profilesResult.error?.message].filter(Boolean).join(' · ')}</p></div>}
    <div className="grid three" style={{marginTop:24}}>
      <article className="card"><span className="muted">طلبات الخدمة</span><h2>{requests.length}</h2></article>
      <article className="card"><span className="muted">عروض الأسعار</span><h2>{quotes.length}</h2></article>
      <article className="card"><span className="muted">المواعيد</span><h2>{appointments.length}</h2></article>
    </div>
    <section style={{marginTop:30}}><h2>طلبات الخدمة ({requests.length})</h2><div style={{display:'grid',gap:16,marginTop:14}}>
      {requests.map((request) => {
        const service = Array.isArray(request.services) ? request.services[0]?.name : request.services?.name;
        const requestQuotes = quotes.filter((quote) => quote.request_id === request.id);
        const requestAppointments = appointments.filter((appointment) => appointment.request_id === request.id);
        return <article className="card" key={request.id}>
          <div style={{display:'flex',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}>
            <div><span className="kicker">{request.request_number}</span><h3>{service ?? 'خدمة'} · {request.status}</h3><p>{request.description || 'لا يوجد وصف'}</p><small className="muted">العميل: {request.customer_id} · أُنشئ {new Date(request.created_at).toLocaleString('ar-DZ')}</small>{request.preferred_at && <p className="muted">الوقت المفضل: {new Date(request.preferred_at).toLocaleString('ar-DZ')}</p>}</div>
            <form action={transitionServiceRequest} style={{display:'grid',gap:8,minWidth:220,alignContent:'start'}}>
              <input type="hidden" name="request_id" value={request.id}/><input type="hidden" name="return_to" value="/admin/services"/>
              <label>الانتقال إلى<select name="to_status" required defaultValue=""><option value="" disabled>اختر الحالة</option>{nextStatuses(request.status).map((status)=><option key={status} value={status}>{status}</option>)}</select></label>
              <input name="note" placeholder="ملاحظة الانتقال (اختياري)"/>
              <button type="submit" disabled={!nextStatuses(request.status).length}>تحديث الحالة</button>
            </form>
          </div>

          {request.status === 'reviewing' && <section className="card" style={{marginTop:16}}>
            <h4>إصدار عرض سعر</h4><p className="muted">إصدار العرض وتغيير الطلب إلى quoted يتمان داخل معاملة واحدة.</p>
            <form action={issueServiceQuote} style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:10}}>
              <input type="hidden" name="request_id" value={request.id}/>
              <label>المبلغ بالدينار<input name="amount" type="number" min="0" step="1" required/></label>
              <label>صالح حتى<input name="valid_until" type="date"/></label>
              <label style={{gridColumn:'1/-1'}}>تفاصيل العرض<textarea name="notes" rows={3} placeholder="الأعمال المشمولة، المواد، مدة الإنجاز والشروط"/></label>
              <button type="submit" style={{gridColumn:'1/-1'}}>إصدار وإرسال عرض السعر</button>
            </form>
          </section>}

          {(request.status === 'accepted' || request.status === 'scheduled') && <section className="card" style={{marginTop:16}}>
            <h4>جدولة موعد الخدمة</h4><p className="muted">إنشاء الموعد وتحديث حالة الطلب إلى scheduled عند الحاجة يتمان داخل معاملة واحدة. الأوقات المدخلة تُفسّر بتوقيت الجزائر (UTC+1).</p>
            <form action={scheduleServiceAppointment} style={{display:'grid',gap:10}}>
              <input type="hidden" name="request_id" value={request.id}/>
              <div className="grid two">
                <label>بداية الموعد<input name="starts_at" type="datetime-local" required/></label>
                <label>نهاية الموعد<input name="ends_at" type="datetime-local" required/></label>
              </div>
              <div className="grid two">
                <label>المسؤول المعيّن<select name="assigned_to" defaultValue=""><option value="">غير معيّن</option>{profiles.map((profile)=><option key={profile.id} value={profile.id}>{profile.full_name || profile.username || profile.id}</option>)}</select></label>
                <label>الموقع<input name="location" placeholder="العنوان أو موقع التدخل"/></label>
              </div>
              <label>ملاحظات<textarea name="notes" rows={2}/></label>
              <button type="submit">حفظ الموعد</button>
            </form>
          </section>}

          <div className="grid two" style={{marginTop:16}}>
            <section className="card"><h4>عروض الأسعار ({requestQuotes.length})</h4>
              {requestQuotes.map((quote)=><div key={quote.id} style={{padding:'10px 0',borderBottom:'1px solid rgba(255,255,255,.08)'}}><strong>{quote.quote_number} · {quote.amount.toLocaleString('ar-DZ')} {quote.currency}</strong><p className="muted">{quote.status}{quote.valid_until ? ' · صالح حتى '+new Date(quote.valid_until).toLocaleDateString('ar-DZ') : ''}</p>{quote.notes && <p>{quote.notes}</p>}</div>)}
              {!requestQuotes.length && <p className="muted">لا يوجد عرض سعر بعد.</p>}
            </section>
            <section className="card"><h4>المواعيد ({requestAppointments.length})</h4>
              {requestAppointments.map((appointment)=><div key={appointment.id} style={{padding:'10px 0',borderBottom:'1px solid rgba(255,255,255,.08)'}}><strong>{new Date(appointment.starts_at).toLocaleString('ar-DZ')} · {appointment.status}</strong><p className="muted">{appointment.ends_at ? 'النهاية: '+new Date(appointment.ends_at).toLocaleString('ar-DZ') : 'لم تحدد النهاية'} · {appointment.location || 'لم يحدد الموقع'}</p>{appointment.assigned_to && <small>المسؤول: {profiles.find((profile)=>profile.id===appointment.assigned_to)?.full_name || profiles.find((profile)=>profile.id===appointment.assigned_to)?.username || appointment.assigned_to}</small>}{appointment.notes && <p>{appointment.notes}</p>}</div>)}
              {!requestAppointments.length && <p className="muted">لم تتم جدولة موعد بعد.</p>}
            </section>
          </div>
        </article>;
      })}
      {!requests.length && <article className="card"><p>لا توجد طلبات خدمة في قاعدة البيانات حتى الآن.</p></article>}
    </div></section>
  </div></main>;
}
