import Link from 'next/link';
import {notFound,redirect} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';
import {CourseLearningActions} from '@/components/academy/CourseLearningActions';
import {LessonQuestions} from '@/components/academy/LessonQuestions';
import {validUuid} from '@/lib/academy/requests';
export const dynamic='force-dynamic';
export default async function AcademyLessonPage({params}:{params:Promise<{id:string}>}){
 const {id}=await params;if(!validUuid.test(id))notFound();
 const db=await createClient();const {data:{user}}=await db.auth.getUser();
 if(!user)redirect('/login?next='+encodeURIComponent('/academy/lessons/'+id));
 const {data:lesson,error}=await db.from('academy_lessons').select('id,module_id,title,body,resource_url,lesson_type,duration_minutes,academy_modules!inner(course_id,title)').eq('id',id).maybeSingle();
 if(error)return <main className="section"><div className="wrap"><h1>تعذر تحميل الدرس</h1><p role="alert">أعد المحاولة بعد قليل.</p></div></main>;
 if(!lesson)return <main className="section"><div className="wrap"><h1>الدرس غير متاح</h1><p>يلزم قبول الطلب وتأكيد الدفع والتسجيل وإكمال الدروس السابقة.</p><Link href="/account/academy">متابعة حساب الطالب</Link></div></main>;
 const moduleRow=Array.isArray(lesson.academy_modules)?lesson.academy_modules[0]:lesson.academy_modules;if(!moduleRow)notFound();
 const {data:assets,error:assetsError}=await db.from('academy_lesson_assets').select('id,file_name,mime_type').eq('lesson_id',id).eq('status','ready').order('created_at');
 return <main className="section"><div className="wrap">
 <Link href={'/academy/'+moduleRow.course_id}>← العودة إلى الدورة</Link>
 <p className="muted">{moduleRow.title}{lesson.duration_minutes?' · '+lesson.duration_minutes+' دقيقة':''}</p><h1>{lesson.title}</h1>
 {lesson.body&&<article className="card" style={{whiteSpace:'pre-wrap',lineHeight:1.9}}>{lesson.body}</article>}
 {lesson.resource_url&&/^https?:\/\//i.test(lesson.resource_url)&&<p><a href={lesson.resource_url} target="_blank" rel="noreferrer">فتح المورد الخارجي ↗</a></p>}
 <section className="card" style={{marginTop:16}}><h2>ملفات الدرس</h2>
 {assetsError?<p role="alert">تعذر تحميل ملفات الدرس.</p>:!assets?.length?<p className="muted">لا توجد ملفات مرفقة.</p>:<ul>{assets.map(asset=><li key={asset.id}><a href={'/api/academy/resources?assetId='+asset.id} target="_blank" rel="noreferrer">{asset.file_name} ↗</a></li>)}</ul>}
 </section>
 <LessonQuestions lessonId={lesson.id}/>
 <CourseLearningActions courseId={moduleRow.course_id} lessons={[{id:lesson.id,title:lesson.title,accessible:true}]}/>
 </div></main>;
}
