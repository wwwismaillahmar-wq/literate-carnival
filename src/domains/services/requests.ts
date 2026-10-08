import { createClient } from '@/lib/supabase/server';
export async function createServiceRequest(input:{requestNumber:string;serviceId:string;description:string;preferredAt?:string|null}){
 const db=await createClient();
 const {data,error}=await db.rpc('create_service_request',{p_request_number:input.requestNumber,p_service_id:input.serviceId,p_description:input.description,p_preferred_at:input.preferredAt??null});
 if(error) throw error;
 return data as string;
}
