import { createClient } from '@/lib/supabase/server';

export async function listFeaturedContent(limit=20){
  const db=await createClient();
  const {data,error}=await db.from('content_featured').select('id,content_type,content_id,featured_at,featured_by,featured_order').order('featured_order').order('featured_at',{ascending:false}).limit(limit);
  if(error) throw error;
  return data??[];
}
