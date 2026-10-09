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
  const id=String(item.���q�^