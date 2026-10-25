import 'server-only';
import {cookies} from 'next/headers';
import {createClient} from '@/lib/supabase/server';
import {DEFAULT_LOCALE,resolveLocale,type AslanLocale} from './core';
export type TranslatableContent='product'|'course'|'service';
export async function serverLocale():Promise<AslanLocale>{
 return resolveLocale((await cookies()).get('aslan-language')?.value||DEFAULT_LOCALE);
}
/** Published overlays only; source rows are immutable and always remain the fallback. */
export async function localizedRows<T extends Record<string,unknown>>(kind:TranslatableContent,rows:T[]):Promise<T[]>{
 if(!rows.length)return rows;
 const locale=await serverLocale();
 const db=await createClient();
 const ids=rows.map(row=>String(row.id)).filter(Boolean);
 const {data,error}=await db.from('content_translations').select('content_id,field,translated_text').eq('content_type',kind).eq('locale',locale).eq('status','published').in('content_id',ids);
 if(error||!data?.length)return rows;
 const overrides=new Map<string,Record<string,string>>();
 for(const item of data){const fields=overrides.get(item.content_id)||{};fields[item.field]=item.translated_text;overrides.set(item.content_id,fields);}
 return rows.map(row=>({...row,...(overrides.get(String(row.id))||{})}));
}
