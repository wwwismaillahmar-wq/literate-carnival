import Link from 'next/link';
import {redirect} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';
export const dynamic='force-dynamic';
const labels:Record<string,string>={submitted:'تم إرسال الطلب',under_review:'قيد المراجعة',needs_information:'يحتاج استكمال معلومات',accepted:'مقبول؛ بانتظار إصدار الفاتورة',payment_pending:'بانتظار تأكيد الدفع',paid:'تم تأكيد الدفع؛ يمكنك التسجيل',enrolled:'مسجل',rejected:'مرفوض',cancelled:'ملغى',expired:'انتهت صلاحية الطلب'};
export default async function StudentAcademyPage(){
 const db=await createClient();const {data:{user}}=await db.auth.getUser();if(!user)redirect('/login?next=/account/academy');
 const [admissions,enrollments,progress,certificates,invoices,assignments]=await Promise.all([
 db.from('academy_admission_applications').select('id,course_id,status,review_note,submitted_at').eq('user_id',user.id).order('submitted_at',{ascending:false}),
 db.from('academy_enrollments').select('id,course_id,status,enrolled_at').eq('user_id',user.id).order('enrolled_at',{ascending:false}),
 db.from('academy_lesson_progress').select('enrollment_id,lesson_id,completed').eq('user_id',user.id).eq('completed',true),
 db.from('academy_certificates').select('id,certificate_code,issued_at,assessment_id').eq('user_id',user.id).order('issued_at',{ascending:false}),
 db.from('invoices').select('id,source_id,invoice_number,total_amount,currency,status').eq('customer_id',user.id).eq('source_type','academy_admission'),
 db.from('academy_course_staff').select('id').eq('user_id',user.id).eq('status','active').limit(1)]);
 const ids=[...new Set([...(admissions.data??[]),...(enrollments.data??[])].map(row=>row.course_id))];
 const courses=ids.length?await db.from('courses').select('id,title').in('id',ids):{data:[],error:null};
 const titles=new Map((courses.data??[]).map(row=>[String(row.id),row.title]));
 return <main className="section"><div className="wrap"><Link href="/account">← حسابي</Link><h1>حساب الطالب</h1>
 <div style={{display:'flex',gap:12,flexWrap:'wrap'}}><Link className="btn secondary" href="/academy">استعراض الدورات</Link><Link className="btn secondary" href="/invoices">الفواتير وطرق الدفع</Link>
 {assignments.data?.length?<Link className="btn secondary" href="/academy/teaching">مكتب التدريس والإشراف</Link>:null}</div>
 {courses.error&&<p role="alert">تعذر تحميل أسماء بعض الدورات.</p>}
 <section style={{marginTop:28}}><h2>طلبات القبول</h2>
 {admissions.error?<p role="alert">تعذر تحميل الطلبات.</p>:!admissions.data?.length?<p className="muted">لم تقدم طلب قبول بعد.</p>:
 <div className="grid">{admissions.data.map(item=><article className="card" key={item.id}><h3>{titles.get(item.course_id)||'الدورة'}</h3><p>{labels[item.status]||item.status}</p>
 {item.review_note&&<p>ملاحظة الإدارة: {item.review_note}</p>}
 {invoices.error?<p role="alert">تعذر تحميل فاتورة الطلب.</p>:(invoices.data??[]).filter(i=>i.source_id===item.id).map(i=><p key={i.id}><Link href="/invoices">{i.invoice_number} · {i.total_amount} {i.currency}</Link> · {i.status==='paid'?'مدفوعة':i.status==='void'?'ملغاة':'بانتظار الدفع'}</p>)}
 <Link href={'/academy/'+item.course_id}>{['paid','enrolled'].includes(item.status)?'فتح الدورة وتأكيد التسجيل':'عرض الدورة'}</Link></article>)}</div>}
 </section><section style={{marginTop:28}}><h2>دوراتي</h2>
 {enrollments.error?<p role="alert">تعذر تحميل التسجيلات.</p>:!enrollments.data?.length?<p className="muted">تظهر الدورات بعد التسجيل المؤكد.</p>:
 <div className="grid">{enrollments.data.map(item=><article className="card" key={item.id}><h3>{titles.get(item.course_id)||'الدورة'}</h3><p>{item.status==='enrolled'?'مسجل':item.status==='completed'?'مكتمل':'التسجيل ملغى'}</p>
 {progress.error?<p role="alert">تعذر تحميل التقدم.</p>:<p>الدروس المكتملة: {(progress.data??[]).filter(row=>row.enrollment_id===item.id).length}</p>}
 {item.status!=='cancelled'&&<Link href={'/academy/'+item.course_id}>متابعة التعلم ↗</Link>}</article>)}</div>}
 </section><section style={{marginTop:28}}><h2>شهاداتي</h2>
 {certificates.error?<p role="alert">تعذر تحميل الشهادات.</p>:!certificates.data?.length?<p className="muted">لا توجد شهادات صادرة بعد.</p>:
 <div className="grid">{certificates.data.map(item=><article className="card" key={item.id}><strong>{item.certificate_code}</strong><p>{new Date(item.issued_at).toLocaleDateString('ar-DZ')}</p><Link href={'/certificates/verify?code='+encodeURIComponent(item.certificate_code)}>التحقق من الشهادة ↗</Link></article>)}</div>}
 </section></div></main>;
}
