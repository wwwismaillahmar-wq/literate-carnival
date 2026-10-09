import { createClient } from '@/lib/supabase/server';

export async function listServices(){
 const db=await createClient(); const {data,error}=await db.from('services').select('id,name,slug,description,active').eq('active',true).order('name');
 if(error) throw error; return data??[];
}
export async function listMyServiceRequests(){
 const db=await createClient(); const {data:{user}}=await db.auth.getUser(); if(!user) return [];
 const {data,error}=await db.from('service_requests').select('id,request_number,status,description,preferred_at,service_id,created_at,services(name),service_quotes(id,quote_number,amount,currency,status,valid_until,notes,created_at),service_appointments(id,status,starts_at,ends_at,location,notes)').eq('customer_id',user.id).order('created_at',{ascending:false});
 if(error) throw error; return data??[];
}
