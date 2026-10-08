import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function MarketAdmin(){
 const db=await createClient();
 const [p,c,l]=await Promise.all([
  db.from('products').select('id,name,slug,price_dzd,stock,active,category_id').order('id',{ascending:false}).limit(100),
  db.from('categories').select('id,name,slug').order('name'),
  db.from('leads').select('id,name,phone,status,created_at').order('created_at',{ascending:false}).limit(100)
 ]);
 return <main className="section"><div className="wrap"><Link href="/admin/control">← الإدارة</Link><span className="kicker" style={{display:'block',marginTop:24}}>M12 / MARKET</span><h1>السوق</h1><p className="muted">إدارة الكتالوج الحالي: المنتجات، التصنيفات والعملاء المحتملون. الطلب والدفع سيُربطان عبر المراحل التجارية اللاحقة.</p><div className="grid three" style={{marginTop:24}}><article className="card"><h2>Products</h2><strong>{p.data?.length??0}</strong></article><article className="card"><h2>Categories</h2><strong>{c.data?.length??0}</strong></article><article className="card"><h2>Leads</h2><strong>{l.data?.length??0}</strong></article></div><section style={{marginTop:32}}><h2>المنتجات</h2><div className="grid">{(p.data??[]).map(x=><article className="card" key={x.id}><h3>{x.name}</h3><p>{x.price_dzd??'—'} DZD · المخزون الحالي: {x.stock??0}</p><small>{x.active?'نشط':'غير نشط'} · {x.slug}</small></article>)}</div></section></div></main>;
}
