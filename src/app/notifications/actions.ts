'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
export async function markNotificationRead(formData: FormData) {
 const db=await createClient(); const {data:{user}}=await db.auth.getUser();
 if(!user) redirect('/login?next=/notifications');
 const id=String(formData.get('notification_id')??'');
 if(!/^[0-9a-f-]{36}$/i.test(id)) redirect('/notifications?error=invalid');
 const {error}=await db.from('notifications').update({read_at:new Date().toISOString()}).eq('id',id).eq('recipient_id',user.id);
 if(error) redirect('/notifications?error=save'); revalidatePath('/notifications');
}
export async function markAllNotificationsRead() {
 const db=await createClient(); const {data:{user}}=await db.auth.getUser();
 if(!user) redirect('/login?next=/notifications');
 const {error}=await db.from('notifications').update({read_at:new Date().toISOString()}).eq('recipient_id',user.id).is('read_at',null);
 if(error) redirect('/notifications?error=save'); revalidatePath('/notifications');
}
