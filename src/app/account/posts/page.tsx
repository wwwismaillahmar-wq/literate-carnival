import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import PostForm from '@/components/PostForm';

const visibilityLabels: Record<string, string> = { public: 'عام', friends: 'الأصدقاء', private: 'خاص' };
const statusLabels: Record<string, string> = { draft: 'مسودة', pending: 'قيد المراجعة', needs_revision: 'تحتاج تعديل', accepted: 'مقبولة', published: 'منشورة', rejected: 'مرفوضة', archived: 'مؤرشفة' };

export default async function PostsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/account/posts');

  const { data: posts } = await supabase
    .from('posts')
    .select('id, title, content, visibility, status, created_at')
    .eq('author_id', user.id)
    .order('created_at', { ascending: false });

  return (
    <main className="section" style={{ minHeight: '70vh' }}>
      <div className="wrap">
        <span className="kicker">ASLAN POSTS</span>
        <h1>منشوراتي</h1>
        <p className="muted">مساحتك للمشاركة الاجتماعية داخل ASLAN. المنشور العام أو الخاص بالأصدقاء يمر بالمراجعة قبل النشر.</p>
        <div style={{ marginTop: 28 }}><PostForm /></div>
        <div className="card" style={{ marginTop: 28 }}>
          <span className="kicker">السجل</span>
          <h2>منشوراتي السابقة</h2>
          {posts?.length ? (
            <div className="grid" style={{ gap: 14 }}>
              {posts.map((post) => (
                <article className="card" key={post.id}>
                  <span className="kicker">{visibilityLabels[post.visibility] || post.visibility} · {statusLabels[post.status] || post.status}</span>
                  <h3>{post.title}</h3>
                  <p>{post.content}</p>
                  <p className="muted">{new Date(post.created_at).toLocaleDateString('ar-DZ')}</p>
                </article>
              ))}
            </div>
          ) : <p className="muted">لا توجد منشورات بعد.</p>}
        </div>
        <div style={{ marginTop: 24 }}><Link className="btn secondary" href="/account">← العودة إلى حسابي</Link></div>
      </div>
    </main>
  );
}
