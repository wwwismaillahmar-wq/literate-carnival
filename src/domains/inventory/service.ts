import { createClient } from '@/lib/supabase/server';

export async function listInventory(){
  const db=await createClient();
  const {data,error}=await db.from('inventory_items').select('id,product_id,sku,quantity_on_hand,quantity_reserved,reorder_level,status,updated_at,products(id,name,slug)').order('updated_at',{ascending:false});
  if(error) throw error;
  return data??[];
}
