import {NextResponse} from 'next/server';
import {createClient} from '@/lib/supabase/server';
import {validUuid,sameOrigin,academyAssetTypes,academyAssetLimit} from '@/lib/academy/requests';
export const dynamic='force-dynamic';
import { contaboAssetRequest } from '@/lib/academy/contabo-storage';
const bucket='aslan-academy';
async function staffAccess(db:Awaited<ReturnType<typeof createClient>>,lessonId:string){
 const {data,error}=await db.from('academy_lessons').select('module_id').eq('id',lessonId).maybeSingle();
 if(error||!data)return false;const allowed=await db.rpc('can_manage_academy_module',{p_module_id:data.module_id});
 return !allowed.error&&allowed.data===true;
}
function failure(error:{message:string},fallback:string){
 const review=error.message.includes('PUBLISH_REVIEW_REQUIRED');
 return NextResponse.json({error:review?'تعديل ملفات درس منشور يحتاج موافقة المشرف.':fallback},{status:review?403:500});
}
export async function GET(request:Request){
 const db=await createClient();const {data:{user}}=await db.auth.getUser();
 if(!user)return NextResponse.json({error:'يجب تسجيل الدخول.'},{status:401});
 const lessonId=new URL(request.url).searchParams.get('lessonId')??'';
 if(!validUuid.test(lessonId))return NextResponse.json({error:'معرّف الدرس غير صالح.'},{status:400});
 const {data,error}=await db.from('academy_lesson_assets').select('id,file_name,mime_type,file_size,status,storage_backend').eq('lesson_id',lessonId).order('created_at');
 if(error)return NextResponse.json({error:'تعذر تحميل الملفات.'},{status:500});
 return NextResponse.json({assets:data??[]});
}
export async function POST(request:Request){
 if(!sameOrigin(request))return NextResponse.json({error:'مصدر الطلب غير مسموح.'},{status:403});
 try{
 const db=await createClient();const {data:{user}}=await db.auth.getUser();
 if(!user)return NextResponse.json({error:'يجب تسجيل الدخول.'},{status:401});
 const {lessonId,fileName,mimeType,fileSize}=await request.json();
 if(typeof lessonId!=='string'||!validUuid.test(lessonId)||typeof fileName!=='string'||!fileName.trim()||fileName.length>180||typeof mimeType!=='string'||!academyAssetTypes.has(mimeType)||!Number.isInteger(fileSize)||fileSize<1||fileSize>academyAssetLimit)
 return NextResponse.json({error:'نوع الملف أو حجمه غير صالح. الحد الأقصى 50MB.'},{status:400});
 if(!await staffAccess(db,lessonId))return NextResponse.json({error:'لا تملك صلاحية إدارة هذا الدرس.'},{status:403});
 const id=crypto.randomUUID(),objectPath=lessonId+'/'+id;
 const {error}=await db.from('academy_lesson_assets').insert({id,lesson_id:lessonId,owner_id:user.id,object_path:objectPath,file_name:fileName.trim(),mime_type:mimeType,file_size:fileSize});
 if(error)return failure(error,'تعذر تجهيز سجل الرفع.');
 const signed=await db.storage.from(bucket).createSignedUploadUrl(objectPath);
 if(signed.error||!signed.data){
 await db.from('academy_lesson_assets').delete().eq('id',id);
 return NextResponse.json({error:'تعذر تجهيز الرفع الآمن.'},{status:500});
 }
 return NextResponse.json({assetId:id,bucket,path:objectPath,token:signed.data.token},{status:201});
 }catch{return NextResponse.json({error:'صيغة الطلب غير صالحة.'},{status:400});}
}
export async function PATCH(request:Request){
 if(!sameOrigin(request))return NextResponse.json({error:'مصدر الطلب غير مسموح.'},{status:403});
 try{
 const db=await createClient();const {data:{user}}=await db.auth.getUser();
 if(!user)return NextResponse.json({error:'يجب تسجيل الدخول.'},{status:401});
 const {assetId}=await request.json();
 if(typeof assetId!=='string'||!validUuid.test(assetId))return NextResponse.json({error:'معرّف الملف غير صالح.'},{status:400});
 const {data:asset,error}=await db.from('academy_lesson_assets').select('*').eq('id',assetId).maybeSingle();
 if(error||!asset)return NextResponse.json({error:'الملف غير موجود.'},{status:404});
 if(!await staffAccess(db,asset.lesson_id))return NextResponse.json({error:'لا تملك صلاحية إدارة الملف.'},{status:403});
 if(asset.status==='archived')return NextResponse.json({error:'الملف مؤرشف.'},{status:409});
 if(asset.storage_backend==='contabo'){
  const info=await contaboAssetRequest(db,asset.id,'verify');
  if(!info||info.size!==Number(asset.file_size)||info.mimeType!==asset.mime_type)return NextResponse.json({error:'فشل التحقق من ملف الخادم.'},{status:409});
  return NextResponse.json({error:'تأكيد النقل يتم عبر بوابة الرفع، والاعتماد يتطلب مراجعة المحتوى.',code:'CONTENT_REVIEW_REQUIRED'},{status:409});
 }
 const info=await db.storage.from(bucket).info(asset.object_path);
 if(info.error||!info.data)return NextResponse.json({error:'لم يكتمل الرفع بعد.'},{status:409});
 if((info.data.size??info.data.metadata?.size)!==asset.file_size||(info.data.contentType??info.data.metadata?.mimetype)!==asset.mime_type)
 return NextResponse.json({error:'الملف لا يطابق الحجم أو النوع المسجل. احذفه وأعد الرفع.'},{status:409});
 const updated=await db.from('academy_lesson_assets').update({status:'ready',updated_at:new Date().toISOString()}).eq('id',assetId).eq('status',asset.status).select('id,file_name,mime_type,file_size,status').maybeSingle();
 if(updated.error)return failure(updated.error,'تعذر تثبيت الملف؛ أعد المحاولة.');
 if(!updated.data)return NextResponse.json({error:'تغيرت حالة الملف؛ أعد المحاولة.'},{status:409});
 return NextResponse.json({asset:updated.data});
 }catch{return NextResponse.json({error:'صيغة الطلب غير صالحة.'},{status:400});}
}
export async function DELETE(request:Request){
 if(!sameOrigin(request))return NextResponse.json({error:'مصدر الطلب غير مسموح.'},{status:403});
 const db=await createClient();const {data:{user}}=await db.auth.getUser();
 if(!user)return NextResponse.json({error:'يجب تسجيل الدخول.'},{status:401});
 const id=new URL(request.url).searchParams.get('assetId')??'';
 if(!validUuid.test(id))return NextResponse.json({error:'معرّف الملف غير صالح.'},{status:400});
 const {data:asset}=await db.from('academy_lesson_assets').select('id,lesson_id,object_path,storage_backend').eq('id',id).maybeSingle();
 if(!asset||!await staffAccess(db,asset.lesson_id))return NextResponse.json({error:'لا تملك صلاحية إدارة الملف.'},{status:403});
 const archived=await db.from('academy_lesson_assets').update({status:'archived',updated_at:new Date().toISOString()}).eq('id',id);
 if(archived.error)return failure(archived.error,'تعذر أرشفة الملف.');
 if(asset.storage_backend==='contabo'){
  const removed=await contaboAssetRequest(db,asset.id,'purge');
  if(!removed?.deleted)return NextResponse.json({error:'أُوقف عرض الملف؛ تعذر تنظيف بياناته على الخادم.'},{status:503});
  return NextResponse.json({ok:true});
 }
 const removed=await db.storage.from(bucket).remove([asset.object_path]);
 if(removed.error)return NextResponse.json({error:'أُوقف عرض الملف، لكن تعذر حذف محتواه؛ أعد محاولة الحذف.'},{status:500});
 return NextResponse.json({ok:true});
}
