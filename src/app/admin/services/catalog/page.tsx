import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { deleteService, saveService } from '../../actions';

export const dynamic = 'force-dynamic';

type Service = { id: string; name: string; slug: string; description: string; active: boolean };

export default async function ServiceCatalogAdmin({ searchParams }: { searchParams?: Promise<{ success?: string; error?: string }> }) {
  const params = searchParams ? await searchParams : {};
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/admin/login');
  const { data: isSuperAdmin, error: authError } = await db.rpc('has_role', { role_key: 'super_admin' });
  if (authError || isSuperAdmin !== true) redirect('/');

  const [{ data, error }, { data: requests }] = await Promise.all([
    db.from('services').select('id,name,slug,description,active').order('name'),
    db.from('service_requests').select('id,service_id'),
  ]);
  const services = (data ?? []) as Service[];
  const requestCounts = new Map<string, number>();
  for (const request of requests ?? []) requestCounts.set(request.service_id, (requestCounts.get(request.service_id) ?? 0) + 1);

  return <main className="section"><div className="wrap">
    <div style={{display:'flex',justifyContent:'space-between',gap:16,alignItems:'center',flexWrap:'wrap'}}>
      <div><span className="kicker">M16 / SERVICE CATALOG</span><h1>إدارة كتالوج الخدمات</h1><p className="muted">إنشاء الخدمات وتعديل وصفها ونشرها أو إيقافها. الخدمات النشطة تظهر في كتالوج العميل.</p></div>
      <div style={{display:'flex',gap:8,flexWrap:'wrap'}}><Link className="card" href="/admin/control">بوابة الإدارة</Link><Link className="card" href="/admin/services">تشغيل الطلبات والمواعيد</Link><Link className="card" href="/services" target="_blank">معاينة الخدمات</Link></div>
    </div>
    {params.success && <div className="card" style={{marginTop:16,border:'1px solid #2f855a'}}><strong>✓ {params.success}</strong></div>}
    {params.error && <div className="card" style={{marginTop:16,border:'1px solid #c53030'}}><strong>✕ {params.error}</strong></div>}
    {error && <div className="card" style={{marginTop:16,border:'1px solid #c53030'}}><strong>تعذر تحميل الخدمات: {error.message}</strong></div>}
    <section className="card" style={{marginTop:24}}><h2>إضافة خدمة</h2>
      <form action={saveService} style={{display:'grid',gap:12,marginTop:12}}>
        <label>اسم الخدمة<input name="name" required placeholder="مثال: التمديدات الكهربائية"/></label>
        <label>الرابط المختصر<input name="slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" placeholder="electrical-installation"/></label>
        <label>الوصف<textarea name="description" rows={4} placeholder="نطاق الخدمة، ما يشمله العمل، وما يحتاجه العميل قبل الطلب"/></label>
        <label><input type="checkbox" name="active" defaultChecked/> إظهار الخدمة في الكتالوج العام</label>
        <button type="submit">إنشاء الخدمة</button>
      </form>
    </section>
    <section style={{marginTop:28}}><h2>الخدمات الحالية ({services.length})</h2><div style={{display:'grid',gap:14,marginTop:14}}>
      {services.map((service)=><article className="card" key={service.id}>
        <div style={{display:'flex',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}><div><strong>{service.name}</strong><p className="muted">{service.slug} · {requestCounts.get(service.id) ?? 0} طلب خدمة مرتبط</p></div><span className="market-stock">{service.active ? 'منشورة' : 'موقوفة'}</span></div>
        <form action={saveService} style={{display:'grid',gap:10,marginTop:12}}>
          <input type="hidden" name="id" value={service.id}/>
          <label>اسم الخدمة<input name="name" defaultValue={service.name} required/></label>
          <label>الرابط المختصر<input name="slug" defaultValue={service.slug} required pattern="[a-z0-9]+(-[a-z0-9]+)*"/></label>
          <label>الوصف<textarea name="description" defaultValue={service.description} rows={4}/></label>
          <label><input type="checkbox" name="active" defaultChecked={service.active}/> نشطة في كتالوج العميل</label>
          <button type="submit">حفظ التعديلات</button>
        </form>
        <form action={deleteService} style={{marginTop:10}}>
          <input type="hidden" name="id" value={service.id}/>
          <button type="submit" disabled={(requestCounts.get(service.id) ?? 0) > 0}>حذف الخدمة</button>
          {(requestCounts.get(service.id) ?? 0) > 0 && <small className="muted">لا يمكن حذف خدمة مرتبطة بطلبات؛ أوقفها بدلًا من ذلك.</small>}
        </form>
      </article>)}
      {!services.length && <article className="card"><p>لا توجد خدمات. أضف خدمة من النموذج أعلاه.</p></article>}
    </div></section>
  </div></main>;
}
