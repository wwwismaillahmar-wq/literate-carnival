import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Star } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { submitReview } from './actions';
export const dynamic='force-dynamic';
type Option={type:'product'|'service';id:string;label:string};
export default async function ReviewsPage({searchParams}:{searchParams:Promise<{submitted?:string;error?:string}>}) {
 const params=await searchParams; const db=await createClient(); const {data:{user}}=await db.auth.getUser();
 if(!user) redirect('/login?next=/reviews');
 const [{data:orders,error:oe},{data:services,error:se},{data:reviews,error:re}]=await Promise.all([
  db.from('orders').select('order_number,order_items(product_id,products(name))').eq('user_id',user.id).eq('status','fulfilled').order('created_at',{ascending:false}).limit(100),
  db.from('service_requests').select('id,request_number,service_id,services(name)').eq('customer_id',user.id).eq('status','completed').order('created_at',{ascending:false}).limit(100),
  db.from('reviews').select('id,subject_type,subject_id,rating,body,status,created_at').eq('reviewer_id',user.id).order('created_at',{ascending:false}).limit(50),
 ]);
 if(oe||se||re) throw new Error('تعذر تحميل بيانات التقييمات.');
 const options:Option[]=[];
 for(const order of orders??[]) for(const item of (order.order_items as unknown as Array<{product_id:number;products:{name:string}|null}>)??[]) {
  const id=String(item.product_id); if(!options.some(o=>o.type==='product'&&o.id===id)) options.push({type:'product',id,label:(item.products?.name??'منتج')+' · '+order.order_number});
 }
 for(const s of services??[]) options.push({type:'service',id:s.id,label:((s.services as unknown as {name:string}|null)?.name??'خدمة')+' · '+s.request_number});
 return <main className="section"><div className="wrap"><span className="kicker">VERIFIED REVIEWS</span><h1>التقييمات</h1><p className="muted">التقييم مرتبط بشراء مكتمل أو خدمة منجزة، ويخضع للمراجعة قبل النشر.</p>
  {params.submitted&&<p className="card" role="status">تم استلام تقييمك للمراجعة؛ سيصلك إشعار عند اتخاذ القرار.</p>}
  {params.error&&<p className="card" role="alert">{params.error==='purchase-required'?'لا يمكن تقييم عنصر دون شراء مكتمل أو خدمة منجزة.':params.error==='duplicate'?'سبق أن أرسلت تقييمًا لهذا العنصر.':'تعذر حفظ التقييم؛ تحقق من البيانات وحاول مجددًا.'}</p>}
  <section className="card" style={{marginTop:24}}><h2><Star size={20} style={{display:'inline',verticalAlign:'middle'}}/> أرسل تقييمًا موثقًا</h2>
   {!options.length?<p className="muted">سيظهر هنا ما يمكنك تقييمه بعد اكتمال طلب شراء أو إنجاز خدمة. <Link href="/orders">الطلبات</Link> · <Link href="/service-requests">الخدمات</Link></p>:
   <form action={submitReview} style={{display:'grid',gap:14,marginTop:16}}>
    <label>المنتج أو الخدمة<select name="subject_key" required defaultValue=""><option value="" disabled>اختر عنصرًا</option>{options.map(o=><option key={o.type+o.id} value={o.type+':'+o.id}>{o.label}</option>)}</select></label>
    <label>التقييم<select name="rating" required defaultValue="5"><option value="5">5 — ممتاز</option><option value="4">4 — جيد جدًا</option><option value="3">3 — جيد</option><option value="2">2 — ضعيف</option><option value="1">1 — سيئ</option></select></label>
    <label>تعليق (اختياري)<textarea name="body" rows={4} maxLength={3000} placeholder="صف تجربتك الفعلية."/></label><button className="btn gold" type="submit">إرسال للمراجعة</button>
   </form>}
  </section>
  <section style={{marginTop:28}}><h2>تقييماتي</h2>{!reviews?.length?<p className="muted">لم ترسل تقييمات بعد.</p>:<div style={{display:'grid',gap:10}}>{reviews.map(r=><article className="card" key={r.id}><strong>{r.subject_type==='product'?'منتج':'خدمة'} · {'★'.repeat(r.rating)}{'☆'.repeat(5-r.rating)}</strong><p>{r.body||'دون تعليق'}</p><p className="muted">الحالة: {r.status==='pending'?'قيد المراجعة':r.status==='approved'?'منشور':'غير معتمد'} · {new Date(r.created_at).toLocaleDateString('ar-DZ')}</p></article>)}</div>}</section>
 </div></main>;
}
