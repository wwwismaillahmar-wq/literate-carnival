import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Admin review is deliberately separate from upload confirmation. */
export async function PATCH(request: Request) {
  const origin = request.headers.get('origin');
  if (origin) {
    try { if (new URL(origin).origin !== new URL(request.url).origin)
      return NextResponse.json({error:'مصدر غير مسموح.'},{status:403}); }
    catch { return NextResponse.json({error:'مصدر غير صالح.'},{status:403}); }
  }
  const db = await createClient();
  const {data:{user}} = await db.auth.getUser();
  if (!user) return NextResponse.json({error:'يلزم تسجيل الدخول.'},{status:401});
  const {data:admin,error:roleError} = await db.rpc('has_role',{role_key:'super_admin'});
  if (roleError || admin !== true) return NextResponse.json({error:'المراجعة للإدارة العليا فقط.'},{status:403});
  let body:{assetId?:unknown;decision?:unknown};
  try { body = await request.json(); }
  catch { return NextResponse.json({error:'طلب غير صالح.'},{status:400}); }
  if (typeof body?.assetId !== 'string' || !UUID.test(body.assetId) ||
      !['approve','reject'].includes(String(body.decision)))
    return NextResponse.json({error:'بيانات المراجعة غير صالحة.'},{status:400});
  const {data:asset,error} = await db.from('academy_lesson_assets')
    .select('id,object_path,file_size,status').eq('id',body.assetId).maybeSingle();
  if (error || !asset) return NextResponse.json({error:'الملف غير موجود.'},{status:404});
  if (asset.status !== 'uploaded')
    return NextResponse.json({error:'لا يمكن مراجعة ملف لم يكتمل رفعه.'},{status:409});
  if (body.decision === 'approve') {
    const {data:object,error:storageError} = await db.storage.from('aslan-academy').info(asset.object_path);
    if (storageError || !object || Number(object.size) !== Number(asset.file_size))
      return NextResponse.json({error:'فشل التحقق من وجود الملف وحجمه.'},{status:409});
    // Malware scanning and content QA must be enforced before production enablement.
    return NextResponse.json({error:'اعتماد الملف معطل حتى تفعيل فحص المحتوى والأمان.',code:'CONTENT_SCAN_REQUIRED'},{status:409});
  }
  const {data:saved,error:saveError} = await db.from('academy_lesson_assets')
    .update({status:'rejected',updated_at:new Date().toISOString()})
    .eq('id',asset.id).eq('status','uploaded').select('id,status').maybeSingle();
  if (saveError || !saved) return NextResponse.json({error:'تعذر تسجيل قرار المراجعة.'},{status:500});
  return NextResponse.json({assetId:saved.id,status:saved.status});
}

/** Read-only review queue; never expose private object paths to non-admin users. */
export async function GET() {
  const db = await createClient();
  const {data:{user}} = await db.auth.getUser();
  if (!user) return NextResponse.json({error:'يلزم تسجيل الدخول.'},{status:401});
  const {data:admin,error:roleError} = await db.rpc('has_role',{role_key:'super_admin'});
  if (roleError || admin !== true) return NextResponse.json({error:'غير مصرح.'},{status:403});
  const {data,error} = await db.from('academy_lesson_assets')
    .select('id,lesson_id,file_name,mime_type,file_size,status,created_at')
    .in('status',['pending','uploaded','rejected'])
    .order('created_at',{ascending:false}).limit(100);
  if (error) return NextResponse.json({error:'تعذر تحميل قائمة الملفات.'},{status:500});
  return NextResponse.json({assets:data??[],approvalEnabled:false});
}
