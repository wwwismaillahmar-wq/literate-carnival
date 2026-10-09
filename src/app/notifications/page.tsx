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
  <div style={{display:'flex',justifyContent:'space-between',gap:16,alignItems:'center',flexWrap:'wrap'}}><div><span className="kicker">ACCOUNT / NOTIFICATIONS</span><h1>الإشعارات</h1><p className="muted">تحديثات فعلية لطلباتك ومدفوعاتك وخدماتك والدعم.</p></div>{unread>0&&<form action={markAllNotificationsRead}><button className="bt���q�^