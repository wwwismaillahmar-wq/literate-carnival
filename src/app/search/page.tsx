'use client';

import { useState } from 'react';
import Link from 'next/link';

type Result = { id: string; type: string; title: string; description: string; href: string };
type SearchResponse = { results?: Result[]; total?: number; error?: string; unavailableSources?: string[]; page?: number; pages?: number };

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState('all');
  const [state, setState] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  async function search(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    try {
      const response = await fetch('/api/platform/search?q=' + encodeURIComponent(query) + '&type=' + encodeURIComponent(kind), { cache: 'no-store' });
      const data = await response.json();
      setState(data);
    } catch {
      setState({ error: 'تعذر الاتصال بخدمة البحث.' });
    } finally {
      setLoading(false);
    }
  }
  return <main className="section"><div className="wrap">
    <span className="kicker">M26 / SEARCH PLATFORM</span><h1>البحث الموحد في ASLAN</h1>
    <p className="muted">ابحث في المنتجات والخدمات والدورات والمحتوى وقاعدة المعرفة المتاحة للعرض.</p>
    <form onSubmit={search} className="card" style={{display:'grid',gap:14,marginTop:20}}>
      <label>كلمات البحث<input value={query} onChange={(e)=>setQuery(e.target.value)} minLength={2} maxLength={120} required placeholder="اكتب ما تريد البحث عنه"/></label>
      <label>المجال<select value={kind} onChange={(e)=>setKind(e.target.value)}><option value="all">جميع المجالات</option><option value="products">المنتجات</option><option value="services">الخدمات</option><option value="courses">الدورات</option><option value="content">المحتوى</option><option value="knowledge">قاعدة المعرفة</option></select></label>
      <button className="btn gold" disabled={loading} type="submit">{loading?'جارٍ البحث…':'بحث'}</button>
    </form>
    {state?.error&&<p role="alert" className="card">{state.error}</p>}
    {state&&<section style={{marginTop:24}}><h2>النتائج ({state.total ?? 0})</h2>
      {!!state.unavailableSources?.length&&<p className="muted" role="status">بعض المصادر غير متاحة حاليًا: {state.unavailableSources.join('، ')}. النتائج المعروضة جزئية.</p>}
      {!state.results?.length?<p className="muted">لا توجد نتائج مطابقة.</p>:<div className="grid two">{state.results.map((item)=><article className="card" key={item.id}><span className="kicker">{item.type}</span><h3>{item.title}</h3><p className="muted">{item.description}</p><Link href={item.href}>فتح النتيجة ←</Link></article>)}</div>}
    </section>}
  </div></main>;
}
