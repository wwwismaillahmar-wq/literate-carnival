import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    const db=await createClient();
    const { data: { user }, error }=await db.auth.getUser();
    if (error || !user) return NextResponse.json({error:'غير مسجل الدخول'}, {status:401,headers:{'Cache-Control':'no-store'}});
    const { data: permitted, error: roleError }=await db.rpc('has_role',{role_key:'super_admin'});
    if (roleError || permitted!==true) return NextResponse.json({error:'لا تملك صلاحية الإدارة'}, {status:403,headers:{'Cache-Control':'no-store'}});
    return NextResponse.json({ok:true,authenticated:true,authorized:true,integrations:{gemini:'unverified',notion:'unverified'}},{headers:{'Cache-Control':'no-store'}});
  } catch {
    return NextResponse.json({error:'تعذر التحقق من الصلاحيات'},{status:503,headers:{'Cache-Control':'no-store'}});
  }
}
export async function POST() {
  return NextResponse.json({error:'عمليات الكتابة والمحادثة معطلة حتى اكتمال التفويض والاختبارات'},{status:503,headers:{'Cache-Control':'no-store'}});
}
