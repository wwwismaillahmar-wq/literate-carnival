import { createClient } from '@/lib/supabase/server';

export async function listCatalog(){
  const db=await createClient();
  const [products,categories]=await Promise.all([
    db.from('products').select('id,name,slug,description,price_dzd,stock,active,category_id,home_featured').order('ad_priority',{ascending:false}),
    db.from('categories').select('id,name,slug').order('name'),
  ]);
  if(products.error) throw products.error;
  if(categories.error) throw categories.error;
  return {products:products.data??[],categories:categories.data??[]};
}
