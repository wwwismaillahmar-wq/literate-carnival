import {NextResponse} from 'next/server';
import {createClient} from '@/lib/supabase/server';
export const dynamic='force-dynamic';
export async function GET(){
 const db=await createClient();const {data:{user}}=await db.auth.getUser();if(!user)return NextResponse.json({error:'يجب تسجيل الدخول.'},{status:401});
 const {data:allowed}=await db.rpc('admin_has_permission',{required_permission:'academy.manage'});
 if(allowed!==true)return NextResponse.json({error:'غير مصرح.'},{status:403});
 const {data,error}=await db.from('academy_lesson_questions').select('id,lesson_id,student_id,body,answer,created_at,answered_at').order('created_at',{ascending:false}).limit(200);
 if(error)return NextResponse.json({error:'تعذر تحميل الاستفسارات.'},{status:500});
 return NextResponse.json({questions:data??[]});
}
export async function PATCH(request:Request){
 const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return NextResponse.json({error:'مصدر غير مسموح.'},{status:403});
 const db=await createClient();const {data:{user}}=await db.auth.getUser();if(!user)return NextResponse.json({error:'يجب تسجيل الدخول.'},{status:401});
 const {data:allowed}=await db.rpc('admin_has_permission',{required_permission:'academy.manage'});if(allowed!==true)return NextResponse.json({error:'غير مصرح.'},{status:403});
 let body:{id?:string;answer?:string};try{body=await request.json();}catch{return NextResponse.json({error:'طلب غير صالح.'},{status:400});}
 if(!/^[0-9a-f-]{36}$/i.test(body.id??'')||!body.answer?.trim()||body.answer.length>4000)return NextResponse.json({error:'الرد غير صالح.'},{status:400});
 const {data,error}=await db.rpc('answer_academy_lesson_question',{p_question_id:body.id,p_answer:body.answer.trim()});
 if(error)return NextResponse.json({error:'تعذر حفظ الرد أو لا تملك صلاحية هذه الدورة.'},{status:403});
 return NextResponse.json({question:data});
}