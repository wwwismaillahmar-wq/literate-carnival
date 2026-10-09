import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Bell, CheckCheck, CreditCard, Headset, PackageCheck, Star } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { markAllNotificationsRead, markNotificationRead } from './actions';
export const dynamic='force-dynamic';
const icons:Record<string,typeof Bell>={order:PackageCheck,payment:CreditCard,service:Bell,support:Headset,review:Star,system:Bell};
export default async function NotificationsPage({searchParams}:{searchParams:Promise<{error?:string}>}) {
 const params=await searchParams; const db=await createClient(); const {data:{user}}=await db.auth.getUser();
 if(!user) redirect('/login?next=/notifications');
 const {data:items,error}=await db.from('notifications').select('id,notification_type,title,body,href,read_at,created_at').eq('recipient_id',user.id).order('created_at',{ascending:false}).limit(100);
 if(error) throw new Error('تعذر تحميل الإشعارات.');
 const unread=(items??[]).filter(n=>!n.read_at).length;
 return <main className="section"><div className="wrap">
  <div style={{display:'flex',justifyContent:'space-between',gap:16,alignItems:'center',flexWrap:'wrap'}}><div><span className="kicker">ACCOUNT / NOTIFICATIONS</span><h1>الإشعارات</h1><p className="muted">تحديثات فعلية لطلباتك ومدفوعاتك وخدماتك والدعم.</p></div>{unread>0&&<form action={markAllNotificationsRead}><button className="btn gold" type="submit"><CheckCheck size={17}/> تعليم الكل كمقروء ({unread})</button></form>}</div>
  {params.error&&<p className="card" role="alert">تعذر حفظ حالة الإشعار. حدّث الصفحة وحاول مجددًا.</p>}
  {!items?.length?<section className="card" style={{marginTop:24}}><Bell/><h2>لا توجد إشعارات بعد</h2><p className="muted">ستظهر هنا تحديثات الطلبات والدفع والخدمات والدعم.</p><Link href="/account">العودة إلى حسابي ←</Link></section>:
   <section style={{display:'grid',gap:12,marginTop:24}}>{items.map(n=>{const Icon=icons[n.notification_type]??Bell;return <article className="card" key={n.id} style={{display:'flex',gap:14,alignItems:'flex-start',borderColor:n.read_at?undefined:'rgba(217,176,92,.55)'}}>
    <Icon size={22} aria-hidden="true"/><div style={{flex:1,minWidth:0}}><div style={{display:'flex',gap:10,alignItems:'center',flexWrap:'wrap'}}><strong>{n.title}</strong>{!n.read_at&&<span className="kicker">جديد</span>}</div><p>{n.body}</p><small className="muted">{new Date(n.created_at).toLocaleString('ar-DZ')}</small>{n.href&&<p><Link href={n.href}>فتح التفاصيل ←</Link></p>}</div>
    {!n.read_at&&<form action={markNotificationRead}><input type="hidden" name="notification_id" value={n.id}/><button className="btn line" type="submit">تمت القراءة</button></form>}
   </article>})}</section>}
 </div></main>;
}
