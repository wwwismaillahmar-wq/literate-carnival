import { createClient } from '@/lib/supabase/server';

export async function recordServiceTransition(requestId:string,fromStatus:string|null,toStatus:string,note=''){
 const db=await createClient(); const {data:{user}}=await db.auth.getUser(); if(!user) throw new Error('AUTH_REQUIRED');
 const {error}=await db.from('service_workflow').insert({request_id:requestId,from_status:fromStatus,to_status:toStatus,actor_id:user.id,note});
 if(error) throw error;
 const update=await db.from('service_requests').update({status:toStatus,updated_at:new Date().toISOString()}).eq('id',requestId);
 if(update.error) throw update.error;
}
