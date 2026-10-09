import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { KnowledgeWorkspace } from '@/components/admin/KnowledgeWorkspace';

export const dynamic = 'force-dynamic';

export default async function AdminKnowledgePage() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/admin/login');
  const { data: allowed, error } = await db.rpc('has_role', { role_key: 'super_admin' });
  if (error || allowed !== true) redirect('/');

  return <main className="section"><div className="wrap">
    <Link href="/admin/control">← مركز التحكم</Link>
    <span className="kicker" style={{ display: 'block', marginTop: 24 }}>KNOWLEDGE / M37</span>
    <h1>إدارة المعرفة والموسوعات</h1>
    <p className="muted">إنشاء المقالات والمدخلات العلمية والتقنية، وإدارتها كمسودات أو منشورات. الأرشفة تحفظ السجل بدل حذفه نهائيًا.</p>
    <KnowledgeWorkspace />
  </div></main>;
}
