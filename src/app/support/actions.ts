'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
async function requireSuperAdmin() {
 const db=await createClient(); const {data:{user}}=await db.auth.getUser();
 if(!user) redirect('/admin/login');
 const {data,error}=await db.rpc('has_role',{role_key:'super_admin'});
 if(error||data!==true) redirect('/');
 return {db,user};
}
export async function createSupportTicket(formData:FormData) {
 const db=await createClient(); const {data:{user}}=await db.auth.getUser();
 if(!user) redirect('/login?next=/support');
 const category=String(formData.get('category')??'');
 const subject=String(formData.get('subject')??'').trim();
 const message=String(formData.get('message')??'').trim();
 if(!['order','payment','service','academy','account','complaint','suggestion','other'].includes(category)||subject.length<4||subject.length>160||message.length<10||message.length>10000) redirect('/support?error=validation');
 const {error}=await db.from('support_tickets').insert({customer_id:user.id,category,subject,message});
 if(error) redirect('/support?error=save');
 revalidatePath('/support'); redirect('/support?created=1');
}
export async function updateSupportTicket(formData:FormData) {
 const {db}=await requireSuperAdmin(); const id=String(formData.get('ticket_id')??'');
 const status=String(formData.get('status')??''); const priority=String(formData.get('priority')??'');
 const assignedTo=String(formData.get('assigned_to')??'').trim()||null; const adminReply=String(formData.get('admin_reply')??'').trim();
 if(!/^[0-9a-f-]{36}$/i.test(id)||!['open','in_progress','waiting_customer','resolved','closed'].includes(status)||!['low','normal','high','urgent'].includes(priority)||adminReply.length>10000||(assignedTo&&!/^[0-9a-f-]{36}$/i.test(assignedTo))) redirect('/admin/communications?error=validation');
 const {error}=await db.from('support_tickets').update({status,priority,assigned_to:assignedTo,admin_reply:adminReply,resolved_at:['resolved','closed'].includes(status)?new Date().toISOString():null}).eq('id',id);
 if(error) redirect('/admin/communications?error=save');
 revalidatePath('/admin/communications'); revalidatePath('/support'); redirect('/admin/communications?saved=1');
}
export async function moderateReview(formData:FormData) {
 const {db,user}=await requireSuperAdmin(); const id=String(formData.get('review_id')??''); const status=String(formData.get('status')??'');
 if(!/^[0-9a-f-]{36}$/i.test(id)||!['approved','rejected'].includes(status)) redirect('/admin/communications?error=validation');
 const {error}=await db.from('reviews').update({status,reviewed_at:new Date().toISOString(),reviewed_by:user.id}).eq('id',id);
 if(error) redirect('/admin/communications?error=save');
 revalidatePath('/admin/communications'); revalidatePath('/reviews'); redirect('/admin/communications?saved=1');
}
