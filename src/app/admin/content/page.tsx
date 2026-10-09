import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { updateContribution, updatePost } from '../actions';

export const dynamic = 'force-dynamic';

type Post = { id: string; title: string; status: string; featured: boolean | null; created_at: string };
type Contribution = { id: string; title: string; type: string; status: string; featured: boolean | null; created_at: string };

export default async function AdminContent({ searchParams }: { searchParams?: Promise<{ success?: string; error?: string }> }) {
  const params = searchParams ? await searchParams : {};
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/admin/login');
  const { data: isSuperAdmin, error: authError } = await db.rpc('has_role', { role_key: 'super_admin' });
  if (authError || isSuperAdmin !== true) redirect('/');

  const [postsResult, contributionsResult, featuredResult] = await Promise.all([
    db.from('posts').select('id,title,status,featured,created_at').order('created_at', { ascending: false }).limit(100),
    db.from('contributions').select('id,title,type,status,featured,created_at').order('created_at', { ascending: false }).limit(100),
    db.from('content_featured').select('id,content_type,content_id,featured_at,featured_order').order('featured_order').order('featured_at', { ascending: false }),
  ]);
  const posts = (postsResult.data ?? []) as Post[];
  const contributions = (contributionsResult.data ?? []) as Contribution[];

  return <main className="section"><div className="wrap">
    <div style={{display:'flex',justifyContent:'space-between',gap:16,alignItems:'center',flexWrap:'wrap'}}>
      <div><span className="kicker">M11 / CONTENT & COMMUNITY</span><h1>إدارة المحتوى والمجتمع</h1><p className="muted">إدارة حالة النشر وتمييز المنشورات والمساهمات؛ هذه الأوامر تغيّر سجلات قاعدة البيانات مباشرة.</p></div>
      <div style={{display:'flex',gap:8,flexWrap:'wrap'}}><Link className="card" href="/admin/control">بوابة الإدارة</Link><Link className="card" href="/community" target="_blank">معاينة المجتمع</Link><Link className="card" href="/admin/legacy">أدوات الإدارة المتبقية</Link></div>
    </div>
    {params.success && <div className="card" style={{marginTop:16,border:'1px solid #2f855a'}}><strong>✓ {params.success}</strong></div>}
    {params.error && <div className="card" style={{marginTop:16,border:'1px solid #c53030'}}><strong>✕ {params.error}</strong></div>}
    {(postsResult.error || contributionsResult.error || featuredResult.error) && <div className="card" style={{marginTop:16,border:'1px solid #c53030'}}><strong>تعذر تحميل بعض بيانات المحتوى.</strong><p>{[postsResult.error?.message,contributionsResult.error?.message,featuredResult.error?.message].filter(Boolean).join(' · ')}</p></div>}
    <section style={{marginTop:26}}><h2>المنشورات ({posts.length})</h2><div className="grid two" style={{marginTop:14}}>
      {posts.map((post)=><form action={updatePost} className="card" key={post.id} style={{display:'grid',gap:10}}>
        <input type="hidden" name="id" value={post.id}/><input type="hidden" name="return_to" value="/admin/content"/>
        <strong>{post.title || 'منشور بلا عنوان'}</strong><small className="muted">{new Date(post.created_at).toLocaleString('ar-DZ')}</small>
        <label>حالة النشر<select name="status" defaultValue={post.status}>{['draft','pending','needs_revision','accepted','published','rejected','archived'].map((status)=><option key={status} value={status}>{status}</option>)}</select></label>
        <label><input type="checkbox" name="featured" defaultChecked={post.featured ?? false}/> مميز في الموقع</label>
        <button type="submit">حفظ حالة المنشور</button>
      </form>)}
      {!posts.length && <article className="card"><p>لا توجد منشورات.</p></article>}
    </div></section>
    <section style={{marginTop:30}}><h2>المساهمات ({contributions.length})</h2><div className="grid two" style={{marginTop:14}}>
      {contributions.map((item)=><form action={updateContribution} className="card" key={item.id} style={{display:'grid',gap:10}}>
        <input type="hidden" name="id" value={item.id}/><input type="hidden" name="return_to" value="/admin/content"/>
        <strong>{item.title || 'مساهمة بلا عنوان'}</strong><small className="muted">{item.type} · {new Date(item.created_at).toLocaleString('ar-DZ')}</small>
        <label>حالة المساهمة<select name="status" defaultValue={item.status}>{['pending','needs_revision','accepted','published','rejected'].map((status)=><option key={status} value={status}>{status}</option>)}</select></label>
        <label><input type="checkbox" name="featured" defaultChecked={item.featured ?? false}/> مميز في الموقع</label>
        <button type="submit">حفظ حالة المساهمة</button>
      </form>)}
      {!contributions.length && <article className="card"><p>لا توجد مساهمات.</p></article>}
    </div></section>
    <section style={{marginTop:30}}><h2>سجل المحتوى المميز ({featuredResult.data?.length ?? 0})</h2><div className="grid three" style={{marginTop:14}}>
      {(featuredResult.data ?? []).map((item)=><article className="card" key={item.id}><strong>{item.content_type}</strong><p>{item.content_id}</p><small className="muted">الترتيب {item.featured_order} · {new Date(item.featured_at).toLocaleString('ar-DZ')}</small></article>)}
      {!featuredResult.data?.length && <article className="card"><p>لا توجد عناصر مرتبطة بجدول المحتوى المميز.</p></article>}
    </div></section>
  </div></main>;
}
