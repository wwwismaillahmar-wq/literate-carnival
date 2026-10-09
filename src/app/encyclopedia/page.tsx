import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function EncyclopediaPage({ searchParams }: { searchParams: Promise<{ category?: string; q?: string }> }) {
  const params = await searchParams;
  const category = typeof params.category === 'string' ? params.category.trim().slice(0, 80) : '';
  const term = typeof params.q === 'string' ? params.q.trim().slice(0, 100) : '';
  const db = await createClient();
  let query = db.from('knowledge_articles')
    .select('id,slug,title,excerpt,category,published_at')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(100);
  if (category) query = query.eq('category', category);
  if (term) query = query.or('title.ilike.%' + term.replace(/[,%()]/g, ' ') + '%,excerpt.ilike.%' + term.replace(/[,%()]/g, ' ') + '%');
  const { data: articles, error } = await query;
  const { data: categories } = await db.from('knowledge_articles')
    .select('category').eq('status', 'published').limit(200);
  const categoryNames = [...new Set((categories ?? []).map(row => row.category).filter(Boolean))].sort();

  return <main className="section"><div className="wrap">
    <span className="kicker">ASLAN ENCYCLOPEDIA / M37</span>
    <h1>الموسوعة العلمية والتقنية</h1>
    <p className="muted">مرجع قابل للتوسع للمقالات والمدخلات المنشورة. إدارة المحتوى والمراجعة من بوابة الإدارة.</p>
    <form method="get" className="card" style={{ display: 'grid', gap: 10, marginTop: 20 }}>
      <label>ابحث في العناوين والملخصات<input name="q" defaultValue={term} maxLength={100} placeholder="اكتب موضوعًا أو مصطلحًا" /></label>
      <label>التصنيف<select name="category" defaultValue={category}><option value="">كل التصنيفات</option>{categoryNames.map(name => <option key={name} value={name}>{name}</option>)}</select></label>
      <button className="btn primary" type="submit">بحث</button>
    </form>
    {error && <div className="card" role="alert" style={{ marginTop: 20 }}>تعذر تحميل الموسوعة؛ لم نعرض نتائج بديلة على أنها بيانات فعلية.</div>}
    {!error && !articles?.length && <div className="card" style={{ marginTop: 20 }}>لا توجد مدخلات منشورة تطابق البحث.</div>}
    <section className="grid two" style={{ marginTop: 20 }}>
      {(articles ?? []).map(article => <article className="card" key={article.id}>
        <span className="kicker">{article.category}</span><h2>{article.title}</h2><p className="muted">{article.excerpt}</p>
        <Link href={'/knowledge/' + encodeURIComponent(article.slug)}>قراءة المدخل ←</Link>
      </article>)}
    </section>
  </div></main>;
}
