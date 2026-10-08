import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export default async function FulfillmentPage(){
  const db=await createClient();
  const {data}=await db.from('fulfillment_tasks').select('id,reference_type,reference_id,status,assigned_to,tracking_reference,created_at').order('created_at',{ascending:false});
  return <main className="section"><div className="wrap"><Link href="/admin/control">← الإدارة</Link><span className="kicker" style={{display:'block',marginTop:24}}>M13 / FULFILLMENT</span><h1>التنفيذ والتسليم</h1><p className="muted">طبقة تنفيذ مستقلة عن الطلبات والدفع؛ ترتبط لاحقًا بالكيانات التجارية الفعلية.</p><div className="grid" style={{marginTop:24}}>{(data??[]).map(x=><article className="card" key={x.id}><strong>{x.reference_type} / {x.reference_id}</strong><p>الحالة: {x.status}</p><small>التتبع: {x.tracking_reference||'—'}</small></article>)}</div></div></main>;
}
