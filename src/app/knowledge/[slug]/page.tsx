import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function KnowledgeArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const db = await createClient();
  const { data: article, error } = await db.from('knowledge_articles').select('title,body,category,published_at').eq('slug',slug).eq('status','published').maybeSingle();
  if (error || !article) notFound();
  return <main className="section"><article className="wrap">
    <span className="kicker">M28 / {article.category}</span><h1>{article.title}</h1>
    <p className="muted">{article.published_at ? new Date(article.published_at).toLocaleDateString('ar-DZ') : ''}</p>
    <div className="card" style={{whiteSpace:'pre-wrap',lineHeight:1.9,marginTop:20}}>{article.body}</div>
    <p style={{marginTop:20}}><Link href="/knowledge">العودة إلى قاعدة المعرفة ←</Link></p>
  </article></main>;
}
