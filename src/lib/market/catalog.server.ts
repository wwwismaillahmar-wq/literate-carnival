import 'server-only';
import {createClient} from '@/lib/supabase/server';
import {aslanStore,normalizeMarketProduct,type MarketStore} from './catalog';
export async function getMarketCatalog(){
 const db=await createClient();const [products,categories,stores]=await Promise.all([
 db.from('products').select('*,category:categories(name)').eq('active',true).order('created_at',{ascending:false}).limit(1000),
 db.from('categories').select('id,name,slug').order('name'),
 db.from('market_stores').select('id,name,slug,description,region,logo_url,status').eq('status','approved').order('created_at',{ascending:false}),
 ]);
 const approved=[aslanStore,...(stores.data||[]) as MarketStore[]];const ids=(products.data||[]).map(row=>row.id);
 const media=ids.length?await db.from('media_assets').select('product_id,object_path,bucket_id,media_type').in('product_id',ids).eq('upload_status','uploaded').eq('media_type','image'):{data:[]};
 const images=new Map<number,string[]>();
 await Promise.all((media.data||[]).map(async item=>{const result=await db.storage.from(item.bucket_id||'aslan-media').createSignedUrl(item.object_path,3600);if(result.data?.signedUrl){const urls=images.get(item.product_id)||[];urls.push(result.data.signedUrl);images.set(item.product_id,urls);}}));
 const catalog=(products.data||[]).map(row=>normalizeMarketProduct(row as Record<string,unknown>,images.get(row.id))).filter(product=>approved.some(store=>store.id===product.storeId));
 return {products:catalog,categories:categories.data||[],stores:approved,error:Boolean(products.error),storesError:Boolean(stores.error)};
}
