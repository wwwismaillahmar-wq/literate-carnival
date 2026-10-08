import { createClient } from '@/lib/supabase/server';

export async function listFulfillmentTasks(){
  const db=await createClient();
  const {data,error}=await db.from('fulfillment_tasks').select('id,reference_type,reference_id,status,assigned_to,tracking_reference,created_at,updated_at').order('created_at',{ascending:false});
  if(error) throw error;
  return data??[];
}
