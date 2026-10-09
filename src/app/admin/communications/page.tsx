import Link from 'next/link';
import { redirect } from 'next/navigation';
import { BellRing, ChartNoAxesCombined, Headset, Star } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { moderateReview, updateSupportTicket } from '@/app/support/actions';
export const dynamic='force-dynamic';
const states=[['open','مفتوح'],['in_progress','قيد المعالجة'],['waiting_customer','بانتظار العميل'],['resolved','تم الحل'],['closed','مغلق']];
const priorities=[['low','منخفض'],['normal','عادي'],['high','مرتفع'],['urgent','عاجل']];
export default async function AdminCommunications({searchParams}:{searchParams:Promise<{saved?:string;error?:string}>}) {
 const params=await searchParams; const db=await createClient(); const {data:{user}}=await db.auth.getUser();
 if(!user) redirect('/admin/login');
 const {data:isAdmin,error:authError}=await db.rpc('has_role',{role_key:'super_admin'});
 if(authError||isAdmin!==true) redirect('/');
 const since=new Date(Date.now()-30*86400000).toISOString();
 const [tr,rr,nr,er]=await Promise.all([
  db.from('support_tickets').select('id,ticket_number,customer_id,subject,message,status,priority,admin_reply,created_at').order('created_at',{ascending:false}).limit(100),
  db.from('reviews').select('id,reviewer_id,subject_type,subject_id,rating,body,status,created_at').order('created_at',{ascending:false}).limit(100),
  db.from('notifications').select('id',{count:'exact',head:true}).is('read_at',null),
  db.from('analytics_events').select('id,event_name,path,created_at',{count:'exact'}).gte('created_at',since).order('created_at',{ascending:false}).limit(100),
 ]);
 if(tr.error||rr.error||nr.error||er.error) throw new Error('تعذر تحميل مركز التواصل.');
 const tickets=tr.data??[]; const reviews=rr.data??[]; const events=er.data??[];
 const counts=new Map<string,number>(); for(const e of events) counts.set(e.event_name,(counts.get(e.event_name)??0)+1);
 return <main className="section"><div className="wrap">
  <div style={{display:'flex',justifyContent:'space-between',gap:16,alignItems:'center',flexWrap:'wrap'}}><div><span className="kicker">M18–M25 / OPERATIONS</span><h1>مركز التواصل والثقة والتحليلات</h1><p className="muted">طابور تشغيلي لطلبات الدعم والتقييمات وبيانات الاستخدام الحقيقية.</p></div><Link className="card" href="/admin">لوحة الإدارة ←</Link></div>
  {params.saved&&<p className="card" role="status">تم حفظ التغيير وإشعار صاحب الطلب عند الاقتضاء.</p>}{params.error&&<p className="card" role="alert">لم يُحفظ التغيير. تحقق من البيانات والصلاحيات ثم حاول مجددًا.</p>}
  <div className="grid four" style={{marginTop:22}}>
   <article className="card"><Headset/><h2>{tickets.filter(t=>!['resolved','closed'].includes(t.status)).length}</h2><p>طلبات دعم مفتوحة</p></article>
   <article className="card"><Star/><h2>{reviews.filter(r=>r.status==='pending').length}</h2><p>تقييمات تنتظر المراجعة</p></article>
   <article className="card"><BellRing/><h2>{nr.count??0}</h2><p>إشعارات غير مقروءة</p></article>
   <article className="card"><ChartNoAxesCombined/><h2>{er.count??0}</h2><p>أحداث آخر 30 يومًا</p></article>
  </div>
  <section style={{marginTop:28}}><h2>طلبات الدعم</h2>{!tickets.length?<p className="muted">لا توجد طلبات دعم.</p>:<div style={{display:'grid',gap:12}}>{tickets.map(t=><article className="card" key={t.id}>
   <div style={{display:'flex',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}><strong>{t.subject}</strong><span className="kicker">{t.ticket_number}</span></div><p className="muted">معرّف العميل: {t.customer_id} · {new Date(t.created_at).toLocaleString('ar-DZ')}</p><p>{t.message}</p>
   <form action={updateSupportTicket} style={{display:'grid',gap:12}}><input type="hidden" name="ticket_id" value={t.id}/>
    <div className="grid two"><label>الحالة<select name="status" defaultValue={t.status}>{states.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label><label>الأولوية<select name="priority" defaultValue={t.priority}>{priorities.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label></div>
    <label>رد الإدارة<textarea name="admin_reply" rows={3} maxLength={10000} defaultValue={t.admin_reply} placeholder="الرد الذي سيظهر للعميل."/></label><button className="btn gold" type="submit">حفظ وإشعار العميل</button>
   </form>
  </article>)}</div>}</section>
  <section style={{marginTop:28}}><h2>مراجعة التقييمات</h2>{!reviews.length?<p className="muted">لا توجد تقييمات.</p>:<div style={{display:'grid',gap:12}}>{reviews.map(r=><article className="card" key={r.id}>
   <div style={{display:'flex',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}><strong>{r.subject_type==='product'?'منتج':'خدمة'} · {'★'.repeat(r.rating)}{'☆'.repeat(5-r.rating)}</strong><span className="kicker">{r.status}</span></div><p>{r.body||'دون تعليق'}</p><p className="muted">المراجع: {r.reviewer_id} · العنصر: {r.subject_id}</p>
   {r.status==='pending'&&<div style={{display:'flex',gap:10,flexWrap:'wrap'}}>{['approved','rejected'].map(status=><form action={moderateReview} key={status}><input type="hidden" name="review_id" value={r.id}/><input type="hidden" name="status" value={status}/><button className={status==='approved'?'btn gold':'btn line'} type="submit">{status==='approved'?'اعتماد ونشر':'رفض التقييم'}</button></form>)}</div>}
  </article>)}</div>}</section>
  <section className="card" style={{marginTop:28}}><h2>الأحداث الأكثر تسجيلًا خلال 30 يومًا</h2>{counts.size===0?<p className="muted">لا توجد بيانات بعد؛ يبدأ التسجيل بعد موافقة الزائر على التحليلات.</p>:<div className="grid three">{[...counts.entries()].sort((a,b)=>b[1]-a[1]).map(([name,count])=><div className="card" key={name}><strong>{name}</strong><h3>{count}</h3></div>)}</div>}<p><Link href="/admin/reports">التقارير الإدارية ←</Link></p></section>
 </div></main>;
}
