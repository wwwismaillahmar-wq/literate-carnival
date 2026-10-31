import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
export const dynamic = 'force-dynamic';
export default async function StudentsPage({searchParams}:{searchParams:Promise<{q?:string;course?:string;status?:string}>}) {
 const db=await createClient();
 const {data:{user}}=await db.auth.getUser();if(!user)redirect('/admin/login');
 const {data:allowed}=await db.rpc('admin_has_permission',{required_permission:'academy.manage'});
 if(allowed!==true)redirect('/');
 const p=await searchParams;
 const [{data:applications,error:ae},{data:enrollments,error:ee}]=await Promise.all([
  db.from('academy_admission_applications').select('id,user_id,course_id,applicant_name,applicant_email,applicant_phone,status,submitted_at,reviewed_at,reviewer_id,review_note').order('submitted_at',{ascending:false}).limit(300),
  db.from('academy_enrollments').select('id,user_id,course_id,status,enrolled_at').limit(500)
 ]);
 const ids=[...new Set((applications??[]).map(a=>a.course_id))];
 const {data:courses}=ids.length?await db.from('courses').select('id,title').in('id',ids):{data:[]};
 const titles=new Map((courses??[]).map(c=>[String(c.id),c.title]));
 const all=(applications??[]).filter(a=>(!p.q||[a.applicant_name,a.applicant_email,a.applicant_phone].some(v=>String(v??'').toLowerCase().includes(p.q!.toLowerCase())))&&(!p.course||a.course_id===p.course)&&(!p.status||a.status===p.status));
 return <main className="section"><div className="wrap"><Link href="/admin/academy">← إدارة الأكاديمية</Link><h1>مركز إدارة الطلاب</h1>
 <p className="muted">سجل القبول والتسجيل الفعلي؛ لا تُعرض بيانات تقدم أو درجات غير مثبتة.</p>
 <form method="get" style={{display:'flex',gap:12,flexWrap:'wrap',marginBottom:20}}>
 <input name="q" placeholder="اسم أو بريد أو هاتف" defaultValue={p.q??''}/>
 <select name="course" defaultValue={p.course??''}><option value="">جميع الدورات</option>{(courses??[]).map(c=><option key={String(c.id)} value={String(c.id)}>{c.title}</option>)}</select>
 <select name="status" defaultValue={p.status??''}><option value="">جميع الحالات</option>{['submitted','under_review','accepted','payment_pending','paid','enrolled','rejected'].map(s=><option key={s} value={s}>{s}</option>)}</select>
 <button type="submit">بحث وتصفية</button></form>
 {(ae||ee)&&<p role="alert">تعذر تحميل جزء من السجل. لا تعتمد على القائمة حتى تكتمل البيانات.</p>}
 <p role="status">الطلبات المعروضة: {all.length} · طلبات جديدة: {(applications??[]).filter(a=>a.status==='submitted').length}</p>
 <div className="grid">{all.map(a=>{const enrollment=(enrollments??[]).find(e=>e.user_id===a.user_id&&e.course_id===a.course_id);return <article className="card" key={a.id}>
 <h2>{a.applicant_name}</h2><p>{a.applicant_email} · {a.applicant_phone}</p><p>{titles.get(a.course_id)??a.course_id}</p>
 <p>قرار القبول: {a.status} · التسجيل: {enrollment?.status??'غير مسجل'}</p>
 <p>تاريخ الطلب: {new Date(a.submitted_at).toLocaleString('ar-DZ')}</p>
 <p>تاريخ القرار: {a.reviewed_at?new Date(a.reviewed_at).toLocaleString('ar-DZ'):'لم يصدر'} · المراجع: {a.reviewer_id??'—'}</p>
 {a.review_note&&<p>ملاحظة المراجعة: {a.review_note}</p>}
 <Link href={'/admin/academy/students/'+a.id}>فتح بطاقة الطالب</Link>
 </article>})}</div></div></main>;
}