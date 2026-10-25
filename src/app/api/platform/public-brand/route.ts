import {NextResponse} from 'next/server';
import {unstable_cache} from 'next/cache';
import {createClient} from '@supabase/supabase-js';

const getPublicBrand=unstable_cache(async()=>{
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
 const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 if(!url||!key)return {brandLogoUrl:null,settings:{}};
 const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data,error}=await db.from('site_settings').select('setting_key,setting_value').eq('is_public',true).in('setting_key',['brand_logo_path','brand_gold']);
 if(error)throw error;
 const settings=Object.fromEntries((data||[]).map(row=>[row.setting_key,row.setting_value]));
 const path=typeof settings.brand_logo_path==='string'?settings.brand_logo_path.trim():'';
 // Do not mint signed URLs or expose private media via a public cached endpoint.
 const brandLogoUrl=path?db.storage.from('aslan-media').getPublicUrl(path).data.publicUrl:null;
 return {brandLogoUrl,settings};
},['aslan-public-brand-v1'],{revalidate:60,tags:['site-public-brand']});

export async function GET(){
 try{return NextResponse.json(await getPublicBrand(),{headers:{'Cache-Control':'public, s-maxage=60, stale-while-revalidate=300'}});}
 catch{return NextResponse.json({brandLogoUrl:null,settings:{}},{headers:{'Cache-Control':'no-store'}});}
}
