import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { updateLeadStatus } from '../actions';

export const dynamic = 'force-dynamic';

type Lead = { id: number; name: string | null; phone: string | null; type: string | null; status: string | null; product_id: number | null; created_at: string };

export default async function MarketAdmin() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/admin/login');
  const { data: isSuperAdmin, error: authError } = await db.rpc('has_role', { role_key: 'super_admin' });
  if (authError || isSuperAdmin !== true) redirect('/');

  const [productsResult, categoriesResult, leadsResult] = await Promise.all([
    db.from('products').select('id,name,slug,price_dzd,stock,active,category_id').order('id', { ascending: false }),
    db.from('categories').select('id,name,slug').order('name'),
    db.from('leads').select('id,name,phone,type,status,product_id,created_at').order('created_at', { ascending: false }).limit(200),
  ]);
  const products = productsResult.data ?? [];
  const categories = categoriesResult.data ?? [];
  const leads = (leadsResult.data ?? []) as Lead[];
  const counts = {
    new: leads.filter((lead) => lead.status === 'new').length,
    contacted: leads.filter((lead) => lead.status === 'contacted').length,
    qualified: leads.filter((lead) => lead.status === 'qualified').length,
    closed: leads.filter((lead) => lead.status === 'closed').length,
  };

  return <main className="section"><div className="wrap">
    <div style={{display:'flex',justifyContent:'space-between',gap:16,alignItems:'center',flexWrap:'wrap'}}>
      <div><span className="kicker">M12 / MARKET OPERATIONS</span><h1>إدارة السوق</h1><p className="muted">إدارة كتالوج السوق والعملاء المحتملين ومتابعة الطلب على المنتجات. إدارة بيانات المنتج ووسائطه من صفحة المنتجات المستقلة.</p></div>
      <div style={{display:'flex',gap:8,flexWrap:'wrap'}}><Link className="card" href="/admin/control">بوابة الإدارة</Link><Link className="card" href="/admin/products">إدارة المنتجات</Link><Link className="card" href="/products" target="_blank">عرض المتجر</Link></div>
    </div>
    {(productsResult.error || categoriesResult.error || leadsResult.error) && <div className="card" style={{marginTop:16,border:'1px solid #c53030'}}><strong>تعذر تحميل جزء من بيانات السوق.</strong><p className="muted">{[productsResult.error?.message,categoriesResult.error?.message,leadsResult.error?.message].filter(Boolean).join(' · ')}</p></div>}
    <div className="grid four" style={{marginTop:24}}>
      {[['المنتجات',products.length],['الفئات',categories.length],['عملاء جدد',counts.new],['تم التواصل',counts.contacted],['عملاء مؤهلون',counts.qualified],['مغلقة',counts.closed]].map(([label,value])=><article className="card" key={String(label)}><span className="muted">{label}</span><h2>{value}</h2></article>)}
    </div>
    <section style={{marginTop:30}}><h2>مؤشرات الكتالوج</h2><div className="grid three" style={{marginTop:14}}>
      {products.slice(0,12).map((product)=><article className="card" key={product.id}>
        <span className="kicker">#{product.id}</span><h3>{product.name}</h3><p className="muted">{product.price_dzd ?? 'حسب الطلب'} دج · مخزون {product.stock ?? 0}</p>
        <p className="muted">{product.active ? 'نشط في المتجر' : 'غير منشور'} · {categories.find((category)=>category.id===product.category_id)?.name ?? 'بدون فئة'}</p>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}><Link className="btn secondary" href={`/products/${product.slug}`} target="_blank">معاينة</Link><Link className="btn primary" href="/admin/products">تعديل المنتج</Link></div>
      </article>)}
      {!products.length && <article className="card"><p>لا توجد منتجات. أنشئ أول منتج من إدارة المنتجات.</p><Link href="/admin/products">فتح إدارة المنتجات</Link></article>}
    </div></section>
    <section style={{marginTop:32}}><h2>إدارة العملاء المحتملين ({leads.length} من أحدث السجلات)</h2><p className="muted">تغيير الحالة يُحفظ مباشرة في قاعدة البيانات. إذا فشل الحفظ، ستظهر رسالة الخطأ في بوابة الإدارة.</p>
      <div style={{display:'grid',gap:12,marginTop:14}}>
        {leads.map((lead)=><form action={updateLeadStatus} className="card" key={lead.id} style={{display:'grid',gridTemplateColumns:'minmax(0,1fr) minmax(160px,220px) auto',gap:12,alignItems:'center'}}>
          <input type="hidden" name="id" value={lead.id}/>
          <div><strong>{lead.name || 'بدون اسم'}</strong><p className="muted">{lead.phone || 'لا يوجد هاتف'} · {lead.type || 'طلب عام'} · {new Date(lead.created_at).toLocaleString('ar-DZ')}</p>{lead.product_id && <small>Product #{lead.product_id}</small>}</div>
          <select name="status" defaultValue={lead.status ?? 'new'}><option value="new">جديد</option><option value="contacted">تم التواصل</option><option value="qualified">مؤهل</option><option value="closed">مغلق</option></select>
          <button type="submit">حفظ الحالة</button>
        </form>)}
        {!leads.length && <article className="card"><p>لا توجد طلبات أو عملاء محتملون مسجلون حتى الآن.</p></article>}
      </div>
    </section>
  </div></main>;
}
