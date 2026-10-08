import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export const dynamic='force-dynamic';

export default async function AuditPage() {
  const db=await createClient();
  const {data:{user}}=await db.auth.getUser();
  if(!user) redirect('/admin/login');
  const {data:isAdmin}=await db.rpc('has_role',{role_key:'super_admin'});
  if(!isAdmin) redirect('/');
  const {data:logs}=await db.from('audit_logs').select('id,actor_id,action,resource_type,resource_id,success,before_data,after_data,metadata,occurred_at').order('occurred_at',{ascending:false}).limit(100);
  return <main className="section"><div className="wrap"><Link href="/admin/control">← مركز التشغيل</Link><span className="kicker" style={{display:'block',marginTop:24}}>M09 / AUDIT</span><h1>سجل التدقيق</h1><p className="muted">آخر 100 عملية إدارية مسجلة مع الفاعل والكيان والوقت والبيانات قبل/بعد عندما تكون متاحة.</p><div style={{display:'grid',gap:12,marginTop:24}}>{(logs??[]).map(log=><article className="card" key={log.id}><div style={{display:'flex',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}><strong>{log.action} · {log.resource_type}</strong><span className="muted">{new Date(log.occurred_at).toLocaleString('ar-DZ')}</span></div><p className="muted">actor: {log.actor_id||'—'} · resource: {log.resource_id||'—'} · {log.success?'نجاح':'فشل'}</p>{(log.before_data||log.after_data)&&<details><summary>قبل / بعد</summary><pre style={{whiteSpace:'pre-wrap',overflow:'auto'}}>{JSON.stringify({before:log.before_data,after:log.after_data},null,2)}</pre></details>}</article>)}</div></div></main>;
}
