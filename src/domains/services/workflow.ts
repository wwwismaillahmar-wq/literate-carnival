import { createClient } from '@/lib/supabase/server';

export async function recordServiceTransition(requestId:string,toStatus:string,note=''){
 const db=await createClient();
 const {error}=await db.rpc('transition_service_request',{p_request_id:requestId,p_to_status:toStatus,p_note:note});
 if(error) throw error;
}
