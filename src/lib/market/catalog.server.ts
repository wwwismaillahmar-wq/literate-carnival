import 'server-only';
import {localizedRows} from '@/lib/i18n/content.server';
import {createClient as createPublicClient} from '@supabase/supabase-js';
import {unstable_cache} from 'next/cache';
import {aslanStore,normalizeMarketProduct,type MarketStore} from './catalog';
const publicDb=()=>createPublicClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,{auth:{persistSession:false,autoRefreshToken:false}});
const loadPublicCatalog=unstable_cache(async (slug?:string)=>{
 const db=publicDb();const [products,categories,stores]=await Promise.all([
 (slug ? db.from('products').select('*,category:categories(name)').eq('active',true).eq('slug',slug).limit(1) : db.from('products').select('*,category:categories(name)').eq('active',true).order('created_at',{ascending:false}).limit(24)),
 db.from('categories').select('id,name,slug').order('name'),
 db.from('market_stores').select('id,name,slug,description,region,logo_url,status').eq('status','approved').order('created_at',{ascending:false}),
 ]);
 const approved=[aslanStore,...(stores.data||[]) as MarketStore[]];const ids=(products.data||[]).map(row=>row.id);
 const media=ids.length?await db.from('media_assets').select('product_id,object_path,bucket_id,media_type').in('product_id',ids).eq('upload_status','uploaded').eq('media_type','image'):{data:[]};
 const images=new Map<number,string[]>();
 // Only explicitly public buckets may use stable public URLs. Private media remain inaccessible here.
 for(const item of media.data||[]){if(item.bucket_id!=='aslan-public-media')continue;
  const url=db.storage.from(item.bucket_id).getPublicUrl(item.object_path).data.publicUrl;
  const urls=images.get(item.product_id)||[];urls.push(url);images.set(item.product_id,urls);
 }
 return {rows:(products.data||[]) as Record<string,unknown>[],images:Object.fromEntries(images),categories:categories.data||[],stores:approved,error:Boolean(products.error),storesError:Boolean(stores.error)};
},['market-products-v2'],{revalidate:60,tags:['market-products']});
async function localizedCatalog(slug?:string){
 const cached=await loadPublicCatalog(slug);
 const [translated,localizedCategories,localizedStores]=await Promise.all([
  localizedRows('product',cached.rows),
  localizedRows('category',cached.categories as Record<string,unknown>[]),
  localizedRows('market_store',cached.stores.filter(store=>store.id!=='aslan') as unknown as Record<string,unknown>[]),
 ]);
 const categories=localizedCategories as typeof cached.categories;
 const categoryNames=new Map(categories.map(category=>[String(category.id),category.name]));
 const stores=cached.stores.map(store=>(localizedStores.find(item=>item.id===store.id) as typeof store|undefined)||store);
 const products=translated.map(row=>{
  const product=normalizeMarketProduct(row,cached.images[Number(row.id)]);
  return {...product,category:categoryNames.get(product.categoryId)||product.category};
 }).filter(product=>stores.some(store=>store.id===product.storeId));
 return {products,categories,stores,error:cached.error,storesError:cached.storesError};
}
export async function getMarketCatalog(){return localizedCatalog();}
export async function getMarketProduct(slug:string){
 const detail=await localizedCatalog(slug);
 const product=detail.products[0];if(!product)return {...detail,products:[]};
 const db=publicDb();const {data:related}=await db.from('products').select('*,category:categories(name)').eq('active',true).eq('category_id',Number(product.categoryId)).neq('id',product.id).order('created_at',{ascending:false}).limit(4);
 const translated=await localizedRows('product',(related||[]) as Record<string,unknown>[]);
 return {...detail,products:[product,...translated.map(row=>normalizeMarketProduct(row)).filter(p=>detail.stores.some(s=>s.id===p.storeId))]};
}
