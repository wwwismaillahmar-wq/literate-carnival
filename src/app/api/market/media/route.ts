import {NextResponse} from 'next/server';import {createClient} from '@/lib/supabase/server';import {sameOrigin} from '@/lib/academy/requests';
export const dynamic='force-dynamic';
export async function POST(request:Request){
 if(!sameOrigin(request))return NextResponse.json({error:'مصدر الطلب غير مسموح.'},{status:403});
 try{const db=await createClient();const {data:{user}}=await db.auth.getUser();if(!user)return NextResponse.json({error:'سجل الدخول لرفع الصور.'},{status:401});const stores=await db.from('market_stores').select('id').eq('owner_id',user.id).eq('status','approved').limit(1);if(stores.error||!stores.data?.length)return NextResponse.json({error:'رفع صور السوق يتطلب متجرًا معتمدًا.'},{status:403});
 const body=await request.formData();const file=body.get('file');if(!(file instanceof File)||!file.size||file.size>3145728)return NextResponse.json({error:'اختر صورة حتى 3MB.'},{status:400});const bytes=new Uint8Array(await file.arrayBuffer());let extension='';
 if(file.type==='image/jpeg'&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255)extension='jpg';
 if(file.type==='image/png'&&[137,80,78,71,13,10,26,10].every((value,index)=>bytes[index]===value))extension='png';
 if(file.type==='image/webp'&&String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP')extension='webp';
 if(!extension)return NextResponse.json({error:'الصورة يجب أن تكون PNG أو JPEG أو WebP صحيحة.'},{status:400});
 const path='market/'+user.id+'/'+crypto.randomUUID()+'.'+extension;const result=await db.storage.from('market-media').upload(path,bytes,{contentType:file.type,upsert:false});if(result.error)return NextResponse.json({error:'تعذر رفع صورة المنتج.'},{status:500});return NextResponse.json({url:db.storage.from('market-media').getPublicUrl(path).data.publicUrl},{status:201});
 }catch{return NextResponse.json({error:'تعذر قراءة ملف الصورة.'},{status:400});}
}
