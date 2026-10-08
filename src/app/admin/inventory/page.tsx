import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export default async function InventoryPage(){
  const db=await createClient();
  const {data}=await db.from('inventory_items').select('id,product_id,sku,quantity_on_hand,quantity_reserved,reorder_level,status,updated_at,products(name,slug)').order('updated_at',{ascending:false});
  return <main className="section"><div className="wrap"><Link href="/admin/control">← الإدارة</Link><span className="kicker" style={{display:'block',marginTop:24}}>M13 / INVENTORY</span><h1>المخزون</h1><p className="muted">أساس المخزون والحركات والحجز، مرتبط مباشرة بالمنتجات الحالية.</p><div className="grid" style={{marginTop:24}}>{(data??[]).map((x:any)=><article className="card" key={x.id}><h2>{x.products?.name||x.product_id}</h2><p>المتاح: {x.quantity_on_hand} · محجوز: {x.quantity_reserved}</p><p>حد إعادة الطلب: {x.reorder_level} · الحالة: {x.status}</p></article>)}{!(data??[]).length&&<article className="card"><h2>لا توجد سجلات مخزون بعد.</h2><p>يمكن إنشاء سجل مخزون للمنتجات من طبقة الإدارة.</p></article>}</div></div></main>;
}
