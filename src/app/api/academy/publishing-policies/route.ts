import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
export const dynamic = 'force-dynamic';
const keys = new Set(['require_minimum_lessons','require_quiz','allow_partial_publish']);
async function authorized() {
 const db = await createClient();
 const { data: { user } } = await db.auth.getUser();
 if (!user) return { db, user: null, allowed: false };
 const { data, error } = await db.rpc('has_role', { role_key: 'super_admin' });
 return { db, user, allowed: !error && data === true };
}
export async function GET() {
 const { db, user, allowed } = await authorized();
 if (!user) return NextResponse.json({error:'يجب تسجيل الدخول.'},{status:401});
 if (!allowed) return NextResponse.json({error:'هذه السياسات للإدارة العليا فقط.'},{status:403});
 const {data,error} = await db.from('academy_publishing_policies').select('*').order('policy_key');
 if (error) return NextResponse.json({error:'جدول السياسات غير متاح؛ تأكد من ترحيل قاعدة التطوير.'},{status:503});
 return NextResponse.json({policies:data});
}
export async function PATCH(request:Request) {
 const origin=request.headers.get('origin');
 if (origin && new URL(origin).origin !== new URL(request.url).origin) return NextResponse.json({error:'مصدر غير مسموح'},{status:403});
 const { db, user, allowed } = await authorized();
 if (!user) return NextResponse.json({error:'يجب تسجيل الدخول.'},{status:401});
 if (!allowed) return NextResponse.json({error:'الإدارة العليا فقط.'},{status:403});
 let body: Record<string,unknown>;
 try {body=await request.json();}catch{return NextResponse.json({error:'طلب غير صالح'},{status:400});}
 if(typeof body.policy_key!=='string'||!keys.has(body.policy_key)||typeof body.enabled!=='boolean'||!['required','warning'].includes(String(body.enforcement))||
 !Array.isArray(body.exempt_roles)||!Array.isArray(body.delegated_override_roles)||
 ![...body.exempt_roles,...body.delegated_override_roles].every(v=>typeof v==='string'&&/^[a-z_]{3,50}$/.test(v)))
 return NextResponse.json({error:'إعدادات السياسة غير صالحة.'},{status:400});
 const {data,error}=await db.from('academy_publishing_policies').update({
 enabled:body.enabled,enforcement:body.enforcement,exempt_roles:body.exempt_roles,
 delegated_override_roles:body.delegated_override_roles,updated_by:user.id,updated_at:new Date().toISOString()
 }).eq('policy_key',body.policy_key).select('*').single();
 if(error)return NextResponse.json({error:'تعذر حفظ السياسة.'},{status:500});
 return NextResponse.json({policy:data});
}
