import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function KnowledgePage() {
  const db = await createClient();
  const { data: articles, error } = await db.from('knowledge_articles').select('id,slug,title,excerpt,category,published_at').eq('status','published').order('published_at',{ascending:false}).limit(100);
  return <main className="section"><div className="wrap">
    <span className="kicker">M28 / SUPPORT & KNOWLEDGE</span><h1>قاعدة المعرفة</h1><p className="muted">مقالات إرشادية منشورة من إدارة ASLAN.</p>
    {error&&<p className="card" role="alert">تعذر تحميل المقالات حاليًا.</p>}
    {!error&&!articles?.length&&<p className="card muted">لم تنشر مقالات بعد.</p>}
    <div className="grid two" style={{marginTop:20}}>{(articles??[]).map((article)=><article className="card" key={article.id}>
      <span className="kicker">{article.category}</span><h2>{article.title}</h2><p className="muted">{article.excerpt}</p>
      <Link href={'/knowledge/'+encodeURIComponent(article.slug)}>قراءة المقال ←</Link>
    </article>)}</div>
  </div></main>;
}
