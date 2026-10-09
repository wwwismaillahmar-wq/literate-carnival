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
  db.from('notifications').select('id',{count:'exact',head:tru���q�^