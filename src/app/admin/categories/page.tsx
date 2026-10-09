import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { deleteCategory, saveCategory } from '../actions';

export const dynamic = 'force-dynamic';

type Category = { id: number; name: string; slug: string };

export default async function AdminCategories({ searchParams }: { searchParams?: Promise<{ success?: string; error?: string }> }) {
  const params = searchParams ? await searchParams : {};
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/admin/login');
  const { data: isSuperAdmin, error: authError } = await db.rpc('has_role', { role_key: 'super_admin' });
  if (authError || isSuperAdmin !== true) redirect('/');

  const [{ data: categoryRows, error: categoryError }, { data: productRows }] = await Promise.all([
    db.from('categories').select('id,name,slug').order('name'),
    db.from('products').select('id,category_id'),
  ]);
  const categories = (categoryRows ?? []) as Category[];
  const productCounts = new Map<number, number>();
  for (const product of productRows ?? []) {
    if (product.category_id != null) productCounts.set(product.category_id, (productCounts.get(product.category_id) ?? 0) + 1);
  }

  return <main className="section"><div className="wrap">
    <div style={{display:'flex',justifyContent:'space-between',gap:16,alignItems:'center',flexWrap:'wrap'}}>
      <div><span className="kicker">MARKET / CATEGORIES</span><h1>إدارة فئات السوق</h1><p className="muted">إضافة الفئات وتعديلها وحذفها؛ كل تغيير يُحفظ في قاعدة البيانات ويؤثر في فلاتر السوق.</p></div>
      <div style={{display:'flex',gap:8,flexWrap:'wrap'}}><Link className="card" href="/admin/control">بوابة الإدارة</Link><Link className="card" href="/admin/products">المنتجات</Link><Link className="card" href="/products" target="_blank">معاينة السوق</Link></div>
    </div>
    {params.success && <div className="card" style={{marginTop:16,border:'1px solid #2f855a'}}><strong>✓ {params.success}</strong></div>}
    {params.error && <div className="card" style={{marginTop:16,border:'1px solid #c53030'}}><strong>✕ {params.error}</strong></div>}
    {categoryError && <div className="card" style={{marginTop:16,border:'1px solid #c53030'}}><strong>تعذر تحميل الفئات: {categoryError.message}</strong></div>}
    <section className="card" style={{marginTop:24}}><h2>إنشاء فئة</h2>
      <form action={saveCategory} style={{display:'grid',gap:12,marginTop:12}}>
        <input type="hidden" name="return_to" value="/admin/categories"/>
        <label>اسم الفئة<input name="name" required placeholder="مثال: الكراسي والطاولات"/></label>
        <label>الرابط المختصر<input name="slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" placeholder="chairs-tables"/></label>
        <button type="submit">إنشاء الفئة</button>
      </form>
    </section>
    <section style={{marginTop:28}}><h2>الفئات الحالية ({categories.length})</h2><div style={{display:'grid',gap:14,marginTop:14}}>
      {categories.map((category)=><article className="card" key={category.id}>
        <div style={{display:'flex',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}><strong>{category.name}</strong><span className="muted">{productCounts.get(category.id) ?? 0} منتج مرتبط</span></div>
        <form action={saveCategory} style={{display:'grid',gridTemplateColumns:'minmax(0,1fr) minmax(0,1fr) auto',gap:10,marginTop:12,alignItems:'end'}}>
          <input type="hidden" name="id" value={category.id}/><input type="hidden" name="return_to" value="/admin/categories"/>
          <label>اسم الفئة<input name="name" defaultValue={category.name} required/></label>
          <label>الرابط المختصر<input name="slug" defaultValue={category.slug} required pattern="[a-z0-9]+(-[a-z0-9]+)*"/></label>
          <button type="submit">حفظ التعديلات</button>
        </form>
        <form action={deleteCategory} style={{marginTop:10}}>
          <input type="hidden" name="id" value={category.id}/><input type="hidden" name="return_to" value="/admin/categories"/>
          <button type="submit" disabled={(productCounts.get(category.id) ?? 0) > 0}>حذف الفئة</button>
          {(productCounts.get(category.id) ?? 0) > 0 && <small className="muted">لا يمكن حذف فئة مرتبطة بمنتجات؛ انقل المنتجات أولًا.</small>}
        </form>
      </article>)}
      {!categories.length && <article className="card"><p>لا توجد فئات بعد.</p></article>}
    </div></section>
  </div></main>;
}
