import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function AdminContent(){
  const db=await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/admin/login');
  const { data: isSuperAdmin } = await db.rpc('has_role', { role_key: 'super_admin' });
  if (!isSuperAdmin) redirect('/');

  const {data:featured}=await db.from('content_featured').select('id,content_type,content_id,featured_at,featured_order,featured_by').order('featured_order').order('featured_at',{ascending:false});
  return <main className="section"><div className="wrap"><Link href="/admin/control">← الإدارة</Link><span className="kicker" style={{display:'block',marginTop:24}}>M11 / CONTENT</span><h1>إدارة المحتوى المميز</h1><p className="muted">عرض وربط المحتوى المنشور بالموقع المميز. لا يعيد هذا بناء نظام Moderation.</p><div className="grid" style={{marginTop:24}}>{(featured??[]).map(x=><article className="card" key={x.id}><strong>{x.content_type}</strong><p>{x.content_id}</p><small>الترتيب: {x.featured_order} · {new Date(x.featured_at).toLocaleString('ar-DZ')}</small></article>)}</div></div></main>;
}
