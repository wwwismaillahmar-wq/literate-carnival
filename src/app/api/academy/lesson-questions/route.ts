import {NextResponse} from 'next/server';
import {createClient} from '@/lib/supabase/server';
export const dynamic='force-dynamic';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export async function GET(request:Request){
 const db=await createClient();const {data:{user}}=await db.auth.getUser();
 if(!user)return NextResponse.json({error:'يجب تسجيل الدخول.'},{status:401});
 const id=new URL(request.url).searchParams.get('lessonId')??'';
 if(!uuid.test(id))return NextResponse.json({error:'معرف الدرس غير صالح.'},{status:400});
 const {data,error}=await db.from('academy_lesson_questions').select('id,body,answer,created_at,answered_at').eq('lesson_id',id).eq('student_id',user.id).order('created_at',{ascending:false}).limit(50);
 if(error)return NextResponse.json({error:'تعذر تحميل الأسئلة.'},{status:500});
 return NextResponse.json({questions:data??[]});
}
export async function POST(request:Request){
 const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return NextResponse.json({error:'مصدر غير مسموح.'},{status:403});
 const db=await createClient();const {data:{user}}=await db.auth.getUser();if(!user)return NextResponse.json({error:'يجب تسجيل الدخول.'},{status:401});
 let body:{lessonId?:string;question?:string};
 try{body=await request.json();}catch{return NextResponse.json({error:'طلب غير صالح.'},{status:400});}
 const lessonId=body.lessonId??'',question=body.question?.trim()??'';
 if(!uuid.test(lessonId)||question.length<3||question.length>4000)return NextResponse.json({error:'السؤال غير صالح.'},{status:400});
 const {data,error}=await db.from('academy_lesson_questions').insert({lesson_id:lessonId,student_id:user.id,body:question}).select('id,body,answer,created_at,answered_at').single();
 if(error)return NextResponse.json({error:'تعذر حفظ السؤال أو لا تملك صلاحية الدرس.'},{status:403});
 return NextResponse.json({question:data},{status:201});
}