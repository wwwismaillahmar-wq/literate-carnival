import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type Job = { id:string; source_key:string; title:string; branch:string; record_type:string; approval_status:string; status:string; attempts:number; last_error:string|null; notion_page_id:string|null; created_at:string; updated_at:string };
type Attempt = { id:number; job_id:string; attempted_at:string; succeeded:boolean; http_status:number|null; details:string|null };

export default async function ArchiveAdminPage() {
 const db = await createClient();
 const {data:{user}}=await db.auth.getUser();
 if(!user) redirect('/admin/login');
 const {data:allowed,error:roleError}=await db.rpc('has_role',{role_key:'super_admin'});
 if(roleError || allowed!==true) redirect('/');
 const [{data:jobs,error:jobsError},{data:attempts,error:attemptsError}]=await Promise.all([
  db.from('archive_jobs').select('id,source_key,title,branch,record_type,approval_status,status,attempts,last_error,notion_page_id,created_at,updated_at').order('created_at',{ascending:false}).limit(100),
  db.from('archive_job_attempts').select('id,job_id,attempted_at,succeeded,http_status,details').order('attempted_at',{ascending:false}).limit(30)
 ]);
 const rows=(jobs??[]) as Job[], logs=(attempts??[]) as Attempt[];
 const counts={completed:rows.filter(x=>x.status==='completed').length,pending:rows.filter(x=>x.status==='pending'||x.status==='processing').length,failed:rows.filter(x=>x.status==='failed').length};
 return <main className="section" dir="rtl"><div className="wrap">
  <Link href="/admin/control">← مركز التحكم</Link>
  <span className="kicker" style={{display:'block',marginTop:20}}>ASLAN ARCHIVE ENGINE</span>
  <h1>لوحة محرك الأرشفة</h1>
  <p className="muted">مراقبة قائمة انتظار Supabase وسجل محاولات الإرسال إلى Notion. تعرض الأعداد آخر 100 مهمة، وليست إجمالي السجلات التاريخية.</p>
  <div className="grid three" style={{marginTop:20}}>
   <div className="card"><h2>{counts.completed}</h2><p>مكتملة</p></div>
   <div className="card"><h2>{counts.pending}</h2><p>قيد الانتظار أو المعالجة</p></div>
   <div className="card"><h2>{counts.failed}</h2><p>فاشلة وتنتظر إعادة المحاولة</p></div>
  </div>
  {jobsError&&<div className="card" role="alert">تعذر قراءة مهام الأرشفة: {jobsError.message}</div>}
  {!jobsError&&rows.length===0&&<div className="card" style={{marginTop:20}}>لا توجد مهام في قائمة الأرشفة حتى الآن.</div>}
  <section style={{marginTop:25}}><h2>مهام الأرشفة</h2><div className="grid two">
   {rows.map(job=><article className="card" key={job.id}>
    <span className="kicker">{job.branch} · {job.record_type} · {job.approval_status}</span>
    <h3>{job.title}</h3><p>الحالة: <strong>{job.status}</strong> | المحاولات: {job.attempts}</p>
    <small className="muted">المعرّف: {job.source_key}</small>
    {job.last_error&&<p role="alert">آخر خطأ: {job.last_error}</p>}
    {job.notion_page_id&&<p><a href={`https://www.notion.so/${job.notion_page_id.replace(/-/g,'')}`} target="_blank" rel="noopener noreferrer">فتح الوثيقة في Notion ↗</a></p>}
    <small className="muted">آخر تحديث: {new Date(job.updated_at).toLocaleString('ar-DZ')}</small>
   </article>)}
  </div></section>
  <section style={{marginTop:25}}><h2>آخر محاولات الإرسال</h2>
   {attemptsError&&<div className="card" role="alert">تعذر قراءة سجل المحاولات: {attemptsError.message}</div>}
   {!attemptsError&&logs.length===0&&<p className="muted">لم تسجل محاولات إرسال بعد.</p>}
   <div className="grid two">{logs.map(log=><div className="card" key={log.id}>
    <strong>{log.succeeded?'نجاح':'فشل'}</strong> · {new Date(log.attempted_at).toLocaleString('ar-DZ')}
    <p className="muted">HTTP: {log.http_status??'غير متاح'} | المهمة: {log.job_id}</p>
    {log.details&&<p role="alert">{log.details}</p>}
   </div>)}</div>
  </section>
  <p className="muted" style={{marginTop:25}}>هذه لوحة مراقبة للقراءة فقط. تشغيل المحرك يتطلب إعداد أسرار Notion وجدولة المعالج بصورة منفصلة.</p>
 </div></main>;
}
