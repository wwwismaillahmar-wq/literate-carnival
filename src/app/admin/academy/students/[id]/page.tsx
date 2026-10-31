import Link from 'next/link';
import {notFound,redirect} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';
export const dynamic='force-dynamic';
export default async function StudentRecord({params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 if(!/^[0-9a-f-]{36}$/i.test(id))notFound();
 const db=await createClient();const {data:{user}}=await db.auth.getUser();if(!user)redirect('/admin/login');
 const {data:allowed}=await db.rpc('admin_has_permission',{required_permission:'academy.manage'});if(allowed!==true)redirect('/');
 const {data:a,error}=await db.from('academy_admission_applications').select('id,user_id,course_id,applicant_name,applicant_email,applicant_phone,status,submitted_at,reviewed_at,reviewer_id,review_note').eq('id',id).maybeSingle();
 if(error||!a)notFound();
 const [{data:enrollment},{data:course}]=await Promise.all([
 db.from('academy_enrollments').select('id,status,enrolled_at,completed_at').eq('user_id',a.user_id).eq('course_id',a.course_id).maybeSingle(),
 db.from('courses').select('title').eq('id',a.course_id).maybeSingle()
 ]);
 const [{data:progress,error:pe},{data:attempts,error:te}]=await Promise.all([
 enrollment?db.from('academy_lesson_progress').select('lesson_id,completed,completed_at,updated_at').eq('enrollment_id',enrollment.id).order('updated_at',{ascending:false}).limit(200):Promise.resolve({data:[],error:null}),
 a.user_id?db.from('academy_assessment_attempts').select('*').eq('user_id',a.user_id).order('submitted_at',{ascending:false}).limit(100):Promise.resolve({data:[],error:null})
 ]);
 return <main className="section"><div className="wrap"><Link href="/admin/academy/students">← مركز الطلاب</Link>
 <h1>{a.applicant_name}</h1><p>{a.applicant_email} · {a.applicant_phone}</p><h2>{course?.title??a.course_id}</h2>
 <section className="card"><h2>سجل القبول</h2><p>الحالة: {a.status}</p><p>تقديم الطلب: {new Date(a.submitted_at).toLocaleString('ar-DZ')}</p>
 <p>قرار الإدارة: {a.reviewed_at?new Date(a.reviewed_at).toLocaleString('ar-DZ'):'لم يصدر'}</p><p>المراجع: {a.reviewer_id??'—'}</p><p>ملاحظة: {a.review_note??'—'}</p>
 <p>التسجيل: {enrollment?.status??'غير مسجل'} · {enrollment?.enrolled_at??'—'}</p></section>
 <section className="card"><h2>متابعة الدروس</h2>{pe?<p role="alert">تعذر تحميل تقدم الطالب.</p>:<><p>الدروس المكتملة: {(progress??[]).filter(x=>x.completed).length}</p>
 <ul>{(progress??[]).map(x=><li key={x.lesson_id}>{x.lesson_id} — {x.completed?'مكتمل':'غير مكتمل'} — {x.updated_at}</li>)}</ul></>}</section>
 <section className="card"><h2>محاولات الاختبارات</h2>{te?<p role="alert">تعذر تحميل نتائج الاختبارات أو لا تسمح الصلاحيات بعرضها.</p>:<ul>{(attempts??[]).map((x,i)=><li key={String(x.id??i)}>النتيجة: {String(x.score??'—')} · {String(x.submitted_at??'—')}</li>)}</ul>}</section>
 <p className="muted">هذه البطاقة تعرض السجلات المتاحة فقط؛ سجل فتح الدرس والرسائل والملاحظات التفصيلية يحتاج تفعيل مخطط التتبع والمراسلات.</p>
 </div></main>;
}