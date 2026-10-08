import { createClient } from '@/lib/supabase/server';

export async function listMyInvoices(){
 const db=await createClient(); const {data:{user}}=await db.auth.getUser(); if(!user) return [];
 const {data,error}=await db.from('invoices').select('id,invoice_number,source_type,source_id,status,currency,total_amount,due_at,paid_at,created_at').eq('customer_id',user.id).order('created_at',{ascending:false});
 if(error) throw error; return data??[];
}
