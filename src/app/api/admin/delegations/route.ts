import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
export const dynamic = 'force-dynamic';
async function access() {
  const db = await createClient();
  const {data:{user}} = await db.auth.getUser();
  if (!user) return {db,status:401};
  const {data:allowed} = await db.rpc('has_role',{role_key:'super_admin'});
  return {db,status:allowed===true?200:403};
}
export async function GET() {
  const {db,status}=await access();
  if(status!==200) return NextResponse.json({error:'غير مصرح'},{status});
  const {data,error}=await db.from('admin_permission_grants').select('id,subject_id,permission_key,can_delegate,expires_at,granted_at').order('granted_at',{ascending:false}).limit(200);
  return error?NextResponse.json({error:'تعذر تحميل التفويضات'},{status:500}):NextResponse.json({grants:data??[]});
}
export async function POST(request:Request) {
  if(request.headers.get('origin') && request.headers.get('origin')!==new URL(request.url).origin) return NextResponse.json({error:'مصدر غير مصرح'},{status:403});
  const {db,status}=await access();
  if(status!==200) return NextResponse.json({error:'غير مصرح'},{status});
  let body:{subjectId?:string;permission?:string;canDelegate?:boolean;expiresAt?:string|null};
  try{body=await request.json();}catch{return NextResponse.json({error:'طلب غير صالح'},{status:400});}
  if(!body.subjectId || !body.permission || !/^[a-z][a-z0-9_.]{2,100}$/.test(body.permission)) return NextResponse.json({error:'بيانات غير صالحة'},{status:400});
  const {error}=await db.rpc('admin_grant_permission',{target_id:body.subjectId,target_permission:body.permission,delegate_allowed:body.canDelegate===true,expiry:body.expiresAt||null});
  return error?NextResponse.json({error:'تعذر منح الصلاحية'},{status:403}):NextResponse.json({ok:true});
}

export async function DELETE(request:Request) {
  if(request.headers.get('origin') && request.headers.get('origin')!==new URL(request.url).origin) return NextResponse.json({error:'مصدر غير مصرح'},{status:403});
  const {db,status}=await access();
  if(status!==200) return NextResponse.json({error:'غير مصرح'},{status});
  let body:{grantId?:string};
  try{body=await request.json();}catch{return NextResponse.json({error:'طلب غير صالح'},{status:400});}
  if(!body.grantId || !/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(body.grantId)) return NextResponse.json({error:'معرّف غير صالح'},{status:400});
  const {error}=await db.rpc('admin_revoke_permission',{target_grant_id:body.grantId});
  return error?NextResponse.json({error:'تعذر سحب الصلاحية'},{status:403}):NextResponse.json({ok:true});
}
