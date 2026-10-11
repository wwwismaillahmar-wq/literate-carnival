import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
export const dynamic = 'force-dynamic';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function sameOrigin(r:Request){const o=r.headers.get('origin');if(!o)return true;try{return new URL(o).origin===new URL(r.url).origin}catch{return false}}
export async function POST(request:Request){
 if(!sameOrigin(request))return NextResponse.json({error:'مصدر الطلب غير مسموح.'},{status:403});
 try{
  const db=await createClient();const {data:{user}}=await db.auth.getUser();
  if(!user)return NextResponse.json({error:'يجب تسجيل الدخول.'},{status:401});
  const {data:admin,error:authError}=await db.rpc('has_role',{role_key:'super_admin'});
  if(authError||admin!==true)return NextResponse.json({error:'إصدار فواتير القبول للإدارة العليا فقط.'},{status:403});
  const body=await request.json();const id=typeof body.applicationId==='string'?body.applicationId.trim():'';
  if(!uuid.test(id))return NextResponse.json({error:'معرّف طلب القبول غير صالح.'},{status:400});
  const {data:app,error:appError}=await db.from('academy_admission_applications').select('id,course_id,user_id,status,applicant_email').eq('id',id).maybeSingle();
  if(appError||!app)return NextResponse.json({error:'طلب القبول غير موجود.'},{status:404});
  if(!app.user_id)return NextResponse.json({error:'المتقدم أرسل الطلب دون حساب. يجب ربط طلبه بحساب مسجل قبل إصدار الفاتورة.'},{status:409});
  if(!['accepted','payment_pending'].includes(app.status))return NextResponse.json({error:'يجب قبول الطلب أولًا قبل إصدار فاتورة الدفع.'},{status:409});
  const {data:course,error:courseError}=await db.from('courses').select('id,title,price_dzd').eq('id',app.course_id).maybeSingle();
  if(courseError||!course)return NextResponse.json({error:'تعذر العثور على الدورة.'},{status:404});
  const price=Number(course.price_dzd);
  if(!Number.isFinite(price)||price<=0)return NextResponse.json({error:'حدّد الإدارة سعرًا موجبًا للدورة قبل إصدار الفاتورة.'},{status:409});
  let {data:invoice,error:invoiceError}=await db.from('invoices').select('id,invoice_number,total_amount,status').eq('source_type','academy_admission').eq('source_id',app.id).maybeSingle();
  if(invoiceError)return NextResponse.json({error:'تعذر التحقق من الفاتورة الحالية.'},{status:500});
  if(!invoice){
   const invoiceNumber='ASL-ACAD-'+new Date().toISOString().slice(0,10).replaceAll('-','')+'-'+app.id.replaceAll('-','').slice(0,8).toUpperCase();
   const created=await db.from('invoices').insert({invoice_number:invoiceNumber,customer_id:app.user_id,source_type:'academy_admission',source_id:app.id,currency:'DZD',subtotal:price,tax_amount:0,total_amount:price,status:'issued'}).select('id,invoice_number,total_amount,status').single();
   if(created.error)return NextResponse.json({error:'تعذر إنشاء فاتورة القبول.'},{status:500});
   invoice=created.data;
  }
  if(app.status!=='payment_pending'){
   const updated=await db.from('academy_admission_applications').update({status:'payment_pending',reviewer_id:user.id,reviewed_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',app.id).eq('status','accepted').select('id').maybeSingle();
   if(updated.error||!updated.data)return NextResponse.json({error:'الفاتورة أُنشئت، لكن تعذر تحديث حالة الطلب. أعد المحاولة؛ ستُعاد الفاتورة نفسها دون تكرار.'},{status:500});
  }
  return NextResponse.json({invoice,message:'تم إصدار الفاتورة. يستطيع المتقدم فتح قسم الفواتير لإتمام الدفع.'},{status:201});
 }catch{return NextResponse.json({error:'صيغة الطلب غير صالحة.'},{status:400})}
}
