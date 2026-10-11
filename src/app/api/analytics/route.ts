import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
const allowed=new Set(['page_view','product_view','add_to_cart','checkout_started','course_enrollment_started']);
export async function POST(request:Request) {
 const origin=request.headers.get('origin'); const host=request.headers.get('x-forwarded-host')??request.headers.get('host');
 if(origin&&host) { try { if(new URL(origin).host!==host) return NextResponse.json({error:'origin_not_allowed'},{status:403}); } catch { return NextResponse.json({error:'invalid_origin'},{status:403}); } }
 let input:unknown; try { input=await request.json(); } catch { return NextResponse.json({error:'invalid_json'},{status:400}); }
 if(!input||typeof input!=='object') return NextResponse.json({error:'invalid_payload'},{status:400});
 const v=input as Record<string,unknown>; const event=String(v.event_name??''); const path=String(v.path??'');
 if(!allowed.has(event)||!path.startsWith('/')||path.startsWith('//')||path.length>500) return NextResponse.json({error:'invalid_event'},{status:400});
 let referrerHost:string|null=null; try { if(v.referrer) referrerHost=new URL(String(v.referrer)).host.slice(0,255); } catch {}
 const clean=(x:unknown,max:number)=>typeof x==='string'?x.trim().slice(0,max)||null:null;
 const db=await createClient(); const {data:{user}}=await db.auth.getUser();
 const {error}=await db.from('analytics_events').insert({event_name:event,path,referrer_host:referrerHost,utm_source:clean(v.utm_source,120),utm_campaign:clean(v.utm_campaign,160),user_id:user?.id??null,metadata:{source:'consented_first_party'}});
 if(error) return NextResponse.json({error:'event_not_saved'},{status:503});
 return NextResponse.json({ok:true},{status:202});
}
