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
 return <main className="section"><div className="wrap"><span className="kicker">CUSTOMER CARE</span><h1>الدعم والشكاوى</h1><p className="muted">لكل طلب رقم وحالة ورد موثق، ويصلك إشعار عند تحد���q�^