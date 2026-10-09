import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { saveCompanyContent, deleteCompanyContent } from '../actions';

export const dynamic = 'force-dynamic';

const types = ['about','vision','mission','activity','project','portfolio','news','faq'] as const;
type CompanyContent = { id:string; content_type:string; slug:string; title:string; excerpt:string|null; body:string|null; sort_order:number; published:boolean; };

export default async function AdminCompanyPage({ searchParams }: { searchParams?: Promise<{ success?: string; error?: string }> }) {
  const params = searchParams ? await searchParams : {};
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/admin/login');
  const { data: isSuperAdmin } = await db.rpc('has_role', { role_key: 'super_admin' });
  if (!isSuperAdmin) redirect('/');
  const { data } = await db.from('company_content').select('id,content_type,slug,title,excerpt,body,sort_order,published').order('sort_order').order('updated_at',{ascending:false});
  const items = (data ?? []) as CompanyContent[];
  return <main className="section"><div className="wrap">
    <Link href="/admin/control">← مركز التشغيل</Link>
    <span className="kicker" style={{display:'block',marginTop:24}}>M09 / COMPANY CONTENT</span>
    <h1>محتوى الشركة</h1>
    {params.success && <div className="card" style={{marginTop:16,border:"1px solid #2f855a"}}><strong>✓ {params.success}</strong></div>}
    {params.error && <div className="card" style={{marginTop:16,border:"1px solid #c53030"}}><strong>✕ {params.error}</strong></div>}
    <p className="muted">كل عملية حفظ أو حذف تُظهر نتيجتها هنا بعد التحقق من قاعدة البيانات.</p>
    <p className="muted">إدارة مباشرة لمحتوى عن ASLAN والرؤية والرسالة والأنشطة والمشاريع والأخبار والأسئلة الشائعة.</p>
    <section className="card" style={{marginTop:24}}>
      <h2>إضافة محتوى</h2>
      <ContentForm />
    </section>
    <div className="grid" style={{marginTop:24}}>
      {items.map((item:CompanyContent)=><article className="card" key={item.id}>
        <span className="kicker">{item.content_type}</span><h2>{item.title}</h2>
        <p className="muted">{item.slug} · {item.published?'منشور':'مسودة'} · ترتيب {item.sort_order}</p>
        <details><summary>تعديل</summary><ContentForm item={item}/></details>
        <form action={deleteCompanyContent} style={{marginTop:10}}><input type="hidden" name="id" value={item.id}/><button type="submit">حذف</button></form>
      </article>)}
    </div>
  </div></main>;
}

function ContentForm({item}:{item?:CompanyContent}) {
 return <form action={saveCompanyContent} style={{display:'grid',gap:10,marginTop:12}}>
   {item && <input type="hidden" name="id" value={item.id}/>}
   <select name="content_type" defaultValue={item?.content_type??'about'}>{types.map(t=><option key={t} value={t}>{t}</option>)}</select>
   <input name="slug" defaultValue={item?.slug??''} placeholder="slug" required/>
   <input name="title" defaultValue={item?.title??''} placeholder="العنوان" required/>
   <input name="excerpt" defaultValue={item?.excerpt??''} placeholder="مقدمة مختصرة"/>
   <textarea name="body" defaultValue={item?.body??''} placeholder="المحتوى" rows={8}/>
   <input name="sort_order" type="number" defaultValue={item?.sort_order??0}/>
   <label><input name="published" type="checkbox" defaultChecked={item?.published??false}/> منشور</label>
   <button type="submit">{item?'حفظ التعديل':'إنشاء المحتوى'}</button>
 </form>;
}