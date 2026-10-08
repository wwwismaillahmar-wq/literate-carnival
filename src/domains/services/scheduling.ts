import { createClient } from '@/lib/supabase/server';

export async function listMyAppointments(){
 const db=await createClient(); const {data:{user}}=await db.auth.getUser(); if(!user) return [];
 const {data,error}=await db.from('service_appointments').select('id,request_id,status,starts_at,ends_at,location,notes').in('request_id',[]);
 if(error) throw error; return data??[];
}
