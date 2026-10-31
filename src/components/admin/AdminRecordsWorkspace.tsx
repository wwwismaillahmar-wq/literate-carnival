import Link from 'next/link';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

type ModuleKey = 'support' | 'encyclopedias';
type RecordRow = { id: string; title: string; body: string; status: string; created_at: string };
const statuses = ['draft','open','in_progress','resolved','published','archived'] as const;

async function adminDb() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/admin/login');
  const { data: allowed, error } = await db.rpc('has_role', { role_key: 'super_admin' });
  if (error || allowed !== true) redirect('/');
  return { db, user };
}

export async function AdminRecordsWorkspace({ module, title }: { module: ModuleKey; title: string }) {
  const { db } = await adminDb();
  const path = '/admin/' + module;
  const { data, error } = await db.from('admin_workspace_records')
    .select('id,title,body,status,created_at').eq('module',module).order('created_at',{ascending:false}).limit(100);
  async function save(formData: FormData) {
    'use server';
    const { db, user } = await adminDb();
    const id = String(formData.get('id') || '');
    const recordTitle = String(formData.get('title') || '').trim().slice(0,200);
    const body = String(formData.get('body') || '').slice(0,20000);
    const status = String(formData.get('status') || 'draft');
    if (!recordTitle || !statuses.includes(status as typeof statuses[number])) throw new Error('Invalid record');
    const payload = { title: recordTitle, body, status, updated_at: new Date().toISOString() };
    const result = id
      ? await db.from('admin_workspace_records').update(payload).eq('id',id).eq('module',module).select('id').single()
      : await db.from('admin_workspace_records').insert({...payload,module,created_by:user.id}).select('id').single();
    if (result.error || !result.data) throw new Error('Failed to save record');
    revalidatePath(path);
  }
  async function remove(formData: FormData) {
    'use server';
    const { db } = await adminDb();
    const id = String(formData.get('id') || '');
    if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error('Invalid id');
    const {data,error} = await db.from('admin_workspace_records').delete().eq('id',id).eq('module',module).select('id').single();
    if (error || !data) throw new Error('Failed to delete record');
    revalidatePath(path);
  }
  return <main className="section"><div className="wrap">
    <Link href="/admin/applications">← تطبيقات المنصة</Link>
    <h1>{title}</h1><p className="muted">سجلات محفوظة في Supabase؛ جميع العمليات تتطلب صلاحية super_admin.</p>
    {error && <p role="alert">تعذر تحميل السجلات: {error.message}</p>}
    <section className="card"><h2>إضافة سجل</h2><form action={save}>
      <label>العنوان <input name="title" required maxLength={200}/></label>
      <label>المحتوى <textarea name="body" rows={5}/></label>
      <input type="hidden" name="status" value="draft"/>
      <button className="btn" type="submit">حفظ</button>
    </form></section>
    {(data as RecordRow[] | null)?.map(record => <section className="card" key={record.id} style={{marginTop:16}}>
      <form action={save}>
        <input type="hidden" name="id" value={record.id}/>
        <label>العنوان <input name="title" defaultValue={record.title} required maxLength={200}/></label>
        <label>المحتوى <textarea name="body" defaultValue={record.body} rows={5}/></label>
        <label>الحالة <select name="status" defaultValue={record.status}>{statuses.map(s=><option key={s} value={s}>{s}</option>)}</select></label>
        <button className="btn" type="submit">تحديث</button>
      </form>
      <form action={remove}><input type="hidden" name="id" value={record.id}/><button type="submit">حذف</button></form>
    </section>)}
  </div></main>;
}
