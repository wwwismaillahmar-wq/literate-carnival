import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Headset, LifeBuoy } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { createSupportTicket } from './actions';
export const dynamic='force-dynamic';
const statuses:Record<string,string>={open:'مفتوح',in_progress:'قيد المعالجة',waiting_customer:'بانتظار ردك',resolved:'تم الحل',closed:'مغلق'};
const categories:Record<string,string>={order:'طلب شراء',payment:'الدفع والفواتير',service:'الخدمات',academy:'الأكاديمية',account:'الحساب',complaint:'شكوى',suggestion:'اقتراح',other:'أخرى'};
export default async function SupportPage({searchParams}:{searchParams:Promise<{created?:string;error?:string}>}) {
 const params=await searchParams; const db=await createClient(); const {data:{user}}=await db.auth.getUser();
 if(!user) redirect('/login?next=/support');
 const {data:tickets,error}=await db.from('support_tickets').select('id,ticket_number,category,subject,message,status,admin_reply,created_at').eq('customer_id',user.id).order('created_at',{ascending:false}).limit(50);
 if(error) throw new Error('تعذر تحميل طلبات الدعم.');
 return <main className="section"><div className="wrap"><span className="kicker">CUSTOMER CARE</span><h1>الدعم والشكاوى</h1><p className="muted">لكل طلب رقم وحالة ورد موثق، ويصلك إشعار عند تحديثه.</p>
  {params.created&&<p className="card" role="status">تم تسجيل طلب الدعم بنجاح.</p>}
  {params.error&&<p className="card" role="alert">{params.error==='validation'?'تحقق من الفئة والعنوان والرسالة.':'تعذر حفظ الطلب. حاول مجددًا.'}</p>}
  <section className="card" style={{marginTop:24}}><h2><Headset size={21} style={{display:'inline',verticalAlign:'middle'}}/> فتح طلب دعم</h2>
   <form action={createSupportTicket} style={{display:'grid',gap:14,marginTop:18}}>
    <label>نوع الطلب<select name="category" required defaultValue="other"><option value="order">طلب شراء</option><option value="payment">الدفع والفواتير</option><option value="service">الخدمات</option><option value="academy">الأكاديمية</option><option value="account">الحساب</option><option value="complaint">شكوى</option><option value="suggestion">اقتراح</option><option value="other">أخرى</option></select></label>
    <label>العنوان<input name="subject" required minLength={4} maxLength={160} placeholder="ملخص واضح للمشكلة"/></label>
    <label>التفاصيل<textarea name="message" required minLength={10} maxLength={10000} rows={5} placeholder="اذكر ما حدث، ورقم الطلب إن وجد."/></label>
    <button className="btn gold" type="submit">إرسال طلب الدعم</button>
   </form>
  </section>
  <section style={{marginTop:28}}><h2>طلباتي السابقة</h2>{!tickets?.length?<div className="card"><LifeBuoy/><p>لم تسجل طلبات دعم بعد.</p></div>:<div style={{display:'grid',gap:12}}>{tickets.map(t=><article className="card" key={t.id}><div style={{display:'flex',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}><strong>{t.subject}</strong><span className="kicker">{t.ticket_number}</span></div><p className="muted">{categories[t.category]??t.category} · {statuses[t.status]??t.status} · {new Date(t.created_at).toLocaleDateString('ar-DZ')}</p><p>{t.message}</p>{t.admin_reply&&<blockquote><strong>رد ASLAN</strong><p>{t.admin_reply}</p></blockquote>}</article>)}</div>}</section>
  <p style={{marginTop:18}}><Link href="/notifications">عرض الإشعارات ←</Link></p>
 </div></main>;
}
