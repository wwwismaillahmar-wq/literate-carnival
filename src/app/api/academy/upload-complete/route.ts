import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { contaboAssetRequest } from '@/lib/academy/contabo-storage';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Confirms object existence after direct upload. Never self-approves content. */
export async function POST(request: Request) {
  const origin = request.headers.get('origin');
  if (origin) {
    try { if (new URL(origin).origin !== new URL(request.url).origin)
      return NextResponse.json({error:'مصدر غير مسموح.'},{status:403}); }
    catch { return NextResponse.json({error:'مصدر غير صالح.'},{status:403}); }
  }
  const db = await createClient();
  const {data:{user}} = await db.auth.getUser();
  if (!user) return NextResponse.json({error:'يلزم تسجيل الدخول.'},{status:401});
  let body: {assetId?: unknown};
  try { body = await request.json(); }
  catch { return NextResponse.json({error:'طلب غير صالح.'},{status:400}); }
  if (typeof body?.assetId !== 'string' || !UUID.test(body.assetId))
    return NextResponse.json({error:'معرّف الملف غير صالح.'},{status:400});
  const {data:asset,error} = await db.from('academy_lesson_assets')
    .select('id,lesson_id,owner_id,object_path,file_size,status,storage_backend')
    .eq('id',body.assetId).eq('owner_id',user.id).maybeSingle();
  if (error || !asset) return NextResponse.json({error:'الملف غير موجود.'},{status:404});
  if (asset.status === 'uploaded' || asset.status === 'ready')
    return NextResponse.json({assetId:asset.id,status:asset.status});
  if (asset.status !== 'pending')
    return NextResponse.json({error:'حالة الملف لا تسمح بالتأكيد.'},{status:409});
  const {data:lesson} = await db.from('academy_lessons').select('module_id').eq('id',asset.lesson_id).maybeSingle();
  if (!lesson) return NextResponse.json({error:'الدرس غير موجود.'},{status:404});
  const {data:allowed} = await db.rpc('can_manage_academy_module',{p_module_id:lesson.module_id});
  if (allowed !== true) return NextResponse.json({error:'غير مصرح.'},{status:403});
  let sha256: string | undefined;
  if (asset.storage_backend === 'contabo') {
    const info = await contaboAssetRequest(db, asset.id, 'verify');
    if (!info || info.size !== Number(asset.file_size) || !info.sha256)
      return NextResponse.json({error:'لم يكتمل الملف على خادم ASLAN أو تعذر التحقق من بصمته.'},{status:409});
    sha256 = info.sha256;
  } else {
    const {data:object,error:storageError} = await db.storage.from('aslan-academy').info(asset.object_path);
    if (storageError || !object || Number(object.size) !== Number(asset.file_size))
      return NextResponse.json({error:'لم يكتمل نقل الملف إلى المخزن.'},{status:409});
  }
  const {data:saved,error:saveError} = await db.from('academy_lesson_assets')
    .update({status:'uploaded',...(sha256 ? {content_sha256:sha256} : {}),updated_at:new Date().toISOString()})
    .eq('id',asset.id).eq('owner_id',user.id).eq('status','pending')
    .select('id,status').maybeSingle();
  if (saveError || !saved) return NextResponse.json({error:'تعذر تسجيل اكتمال النقل.'},{status:500});
  return NextResponse.json({assetId:saved.id,status:saved.status,reviewRequired:true,sha256});
}
