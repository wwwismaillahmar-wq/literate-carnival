import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {sameOrigin,validUuid} from '@/lib/academy/requests';
export const dynamic='force-dynamic';
export async function POST(request:Request){
 if(!sameOrigin(request))return NextResponse.json({error:'مصدر الطلب غير مسموح.'},{status:403});
 try{
 const db=await createClient();const {data:{user}}=await db.auth.getUser();
 if(!user)return NextResponse.json({error:'يجب تسجيل الدخول.'},{status:401});
 const body=await request.json();
 if(typeof body.applicationId!=='string'||!validUuid.test(body.applicationId))return NextResponse.json({error:'معرّف الطلب غير صالح.'},{status:400});
 const {data,error}=await db.rpc('issue_academy_admission_invoice',{p_application_id:body.applicationId});
 if(error){
 const errors:Record<string,[number,string]>={
 FORBIDDEN:[403,'إصدار فواتير القبول للإدارة العليا فقط.'],
 ADMISSION_NOT_FOUND:[404,'طلب القبول غير موجود.'],
 ADMISSION_ACCOUNT_REQUIRED:[409,'يجب ربط الطلب بحساب المتقدم قبل إصدار الفاتورة.'],
 ADMISSION_NOT_ACCEPTED:[409,'يجب قبول الطلب قبل إصدار الفاتورة.'],
 COURSE_PRICE_REQUIRED:[409,'حدّد سعرًا موجبًا للدورة قبل إصدار الفاتورة.'],
 ADMISSION_INVOICE_MISMATCH:[409,'الفاتورة الحالية غير صالحة لهذا الطلب؛ راجع الإدارة المالية.'],
 ADMISSION_INVOICE_MISSING:[409,'تعذر العثور على فاتورة الطلب؛ راجع الإدارة المالية.']};
 const [status,message]=errors[error.message]??[500,'تعذر إصدار الفاتورة؛ لم تُثبت العملية. أعد المحاولة.'];
 return NextResponse.json({error:message},{status});
 }
 return NextResponse.json({invoice:data,message:'تم تثبيت الفاتورة وحالة الطلب. يمكن للمتقدم فتح قسم الفواتير.'});
 }catch{return NextResponse.json({error:'صيغة الطلب غير صالحة.'},{status:400});}
}
