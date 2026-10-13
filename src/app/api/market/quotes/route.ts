import {NextResponse} from 'next/server';
import {createClient} from '@/lib/supabase/server';
import {sameOrigin,validUuid} from '@/lib/academy/requests';
export const dynamic='force-dynamic';
export async function GET(){const db=await createClient();const {data:{user}}=await db.auth.getUser();if(!user)return NextResponse.json({error:'سجل الدخول لمتابعة الاستفسارات.'},{status:401});const result=await db.from('market_quote_requests').select('*').order('created_at',{ascending:false}).limit(100);if(result.error)return NextResponse.json({error:'تعذر تحميل طلبات عروض الأسعار.'},{status:500});const role=await db.rpc('has_role',{role_key:'super_admin'});return NextResponse.json({requests:result.data||[],userId:user.id,admin:!role.error&&role.data===true});}
export async function POST(request:Request){
 if(!sameOrigin(request))return NextResponse.json({error:'مصدر الطلب غير مسموح.'},{status:403});
 try{const db=await createClient();const {data:{user}}=await db.auth.getUser();if(!user)return NextResponse.json({error:'سجل الدخول لإرسال طلب موثق.'},{status:401});const body=await request.json();
 const name=typeof body.name==='string'?body.name.trim():'';const phone=typeof body.phone==='string'?body.phone.trim():'';const message=typeof body.message==='string'?body.message.trim():'';const quantity=Number(body.quantity);
 if(name.length<2||name.length>160||phone.length<6||phone.length>30||message.length<10||message.length>10000||!Number.isInteger(quantity)||quantity<1||quantity>1e6||!['wholesale','custom','availability'].includes(body.type)||body.consent!==true)return NextResponse.json({error:'أكمل بيانات الطلب والموافقة.'},{status:400});
 let productId:number|null=null;let storeId:string|null=null;if(body.productId!==null&&body.productId!==undefined&&body.productId!==''){productId=Number(body.productId);if(!Number.isSafeInteger(productId)||productId<1)return NextResponse.json({error:'المنتج غير صالح.'},{status:400});const result=await db.from('products').select('id,features').eq('id',productId).eq('active',true).maybeSingle();if(result.error||!result.data)return NextResponse.json({error:'المنتج غير متاح للاستفسار.'},{status:404});const feature=result.data.features as Record<string,unknown>|null;if(typeof feature?.market_store_id==='string'&&feature.market_store_id)storeId=feature.market_store_id;}
 const result=await db.from('market_quote_requests').insert({customer_id:user.id,product_id:productId,store_id:storeId,request_type:body.type,quantity,contact_name:name,contact_phone:phone,message,status:'sent'}).select('id').single();if(result.error)return NextResponse.json({error:'تعذر إرسال طلب السعر.'},{status:400});return NextResponse.json({id:result.data.id,message:'تم إرسال الطلب. تابع الرد من طلبات عروض الأسعار.'},{status:201});
 }catch{return NextResponse.json({error:'صيغة الطلب غير صالحة.'},{status:400});}
}
export async function PATCH(request:Request){
 if(!sameOrigin(request))return NextResponse.json({error:'مصدر الطلب غير مسموح.'},{status:403});
 try{const db=await createClient();const {data:{user}}=await db.auth.getUser();if(!user)return NextResponse.json({error:'سجل الدخول.'},{status:401});const body=await request.json();const reply=typeof body.reply==='string'?body.reply.trim():'';if(typeof body.id!=='string'||!validUuid.test(body.id)||!['reviewed','answered','closed'].includes(body.status)||reply.length>10000||(body.status==='answered'&&reply.length<2))return NextResponse.json({error:'أدخل قرارًا وردًا صالحين.'},{status:400});
 const result=await db.from('market_quote_requests').update({status:body.status,reply,updated_at:new Date().toISOString()}).eq('id',body.id).select('id').maybeSingle();if(result.error||!result.data)return NextResponse.json({error:'الرد متاح للمتجر المسؤول أو الإدارة فقط.'},{status:403});return NextResponse.json({message:'تم توثيق الرد.'});
 }catch{return NextResponse.json({error:'صيغة الطلب غير صالحة.'},{status:400});}
}
