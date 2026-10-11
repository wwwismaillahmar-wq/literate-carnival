'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
export async function submitReview(formData:FormData) {
 const db=await createClient(); const {data:{user}}=await db.auth.getUser();
 if(!user) redirect('/login?next=/reviews');
 const key=String(formData.get('subject_key')??''); const split=key.indexOf(':');
 const subjectType=key.slice(0,split); const subjectId=key.slice(split+1);
 const rating=Number(formData.get('rating')); const body=String(formData.get('body')??'').trim();
 if(split<1||!['product','service'].includes(subjectType)||!subjectId||!Number.isInteger(rating)||rating<1||rating>5||body.length>3000) redirect('/reviews?error=validation');
 const {error}=await db.rpc('submit_verified_review',{p_subject_type:subjectType,p_subject_id:subjectId,p_rating:rating,p_body:body});
 if(error) { const code=error.message.includes('VERIFIED_TRANSACTION_REQUIRED')?'purchase-required':error.message.includes('duplicate key')?'duplicate':'save'; redirect('/reviews?error='+code); }
 revalidatePath('/reviews'); redirect('/reviews?submitted=1');
}
