import { createClient } from '@/lib/supabase/server';

export async function listMyOrders(){
 const db=await createClient(); const {data:{user}}=await db.auth.getUser(); if(!user) return [];
 const {data,error}=await db.from('orders').select('id,order_number,status,currency,total_amount,created_at,order_items(product_id,quantity,unit_price,line_total)').eq('user_id',user.id).order('created_at',{ascending:false});
 if(error) throw error; return data??[];
}
