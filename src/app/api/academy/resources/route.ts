import {NextResponse} from 'next/server';
import {createClient} from '@/lib/supabase/server';
import {validUuid} from '@/lib/academy/requests';
import { academyUploadBaseUrl, contaboAssetRequest } from '@/lib/academy/contabo-storage';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 const db=await createClient();const {data:{user}}=await db.auth.getUser();
 if(!user)return NextResponse.json({error:'يجب تسجيل الدخول.'},{status:401});
 const id=new URL(request.url).searchParams.get('assetId')??'';
 if(!validUuid.test(id))return NextResponse.json({error:'معرّف الملف غير صالح.'},{status:400});
 const {data:asset,error}=await db.from('academy_lesson_assets').select('id,object_path,storage_backend').eq('id',id).eq('status','ready').maybeSingle();
 if(error||!asset)return NextResponse.json({error:'الملف غير متاح لهذا الحساب.'},{status:403});
 if(asset.storage_backend==='contabo'){
  const token=await contaboAssetRequest(db,id,'download-token');
  const base=academyUploadBaseUrl();
  if(!base||!token?.path||!token.path.startsWith('/download/'+id+'?token='))return NextResponse.json({error:'تعذر فتح ملف الخادم.'},{status:503});
  const response=NextResponse.redirect(base+token.path);response.headers.set('Cache-Control','private, no-store');return response;
 }
 const signed=await db.storage.from('aslan-academy').createSignedUrl(asset.object_path,300);
 if(signed.error||!signed.data)return NextResponse.json({error:'تعذر فتح الملف.'},{status:500});
 const response=NextResponse.redirect(signed.data.signedUrl);
 response.headers.set('Cache-Control','private, no-store');return response;
}
