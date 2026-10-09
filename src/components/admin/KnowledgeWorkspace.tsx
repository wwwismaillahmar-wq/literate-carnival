'use client';

import { useCallback, useEffect, useState } from 'react';

type Article = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  category: string;
  status: 'draft' | 'published' | 'archived';
  source_title?: string;
  source_url?: string;
  published_at?: string | null;
};

type ArticleDraft = { slug: string; title: string; excerpt: string; body: string; category: string; status: Article['status']; sourceTitle: string; sourceUrl: string };
const emptyArticle: ArticleDraft = { slug: '', title: '', excerpt: '', body: '', category: 'general', status: 'draft', sourceTitle: '', sourceUrl: '' };

export function KnowledgeWorkspace() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [draft, setDraft] = useState(emptyArticle);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch('/api/platform/knowledge', { cache: 'no-store' });
    const result = await response.json() as { articles?: Article[]; admin?: boolean; error?: string };
    if (!response.ok) throw new Error(result.error || 'تعذر تحميل المقالات.');
    if (!result.admin) throw new Error('لا تملك صلاحية إدارة قاعدة المعرفة.');
    setArticles(result.articles ?? []);
  }, []);

  useEffect(() => {
    void load().catch(err => setError(err instanceof Error ? err.message : 'تعذر تحميل المقالات.')).finally(() => setLoading(false));
  }, [load]);

  async function createArticle(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/platform/knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      });
      const result = await response.json() as { article?: Article; error?: string };
      if (!response.ok || !result.article) throw new Error(result.error || 'تعذر إنشاء المقال.');
      setArticles(current => [result.article!, ...current]);
      setDraft(emptyArticle);
      setNotice('تم إنشاء المقال وحفظه في قاعدة البيانات.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر إنشاء المقال.');
    } finally {
      setBusy(false);
    }
  }

  async function updateArticle(article: Article, patch: Partial<Article>) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/platform/knowledge', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: article.id, ...patch }),
      });
      const result = await response.json() as { article?: Article; error?: string };
      if (!response.ok || !result.article) throw new Error(result.error || 'تعذر تحديث المقال.');
      setArticles(current => current.map(row => row.id === article.id ? { ...row, ...result.article } : row));
      setNotice('تم حفظ التعديل.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر تحديث المقال.');
    } finally {
      setBusy(false);
    }
  }

  async function archiveArticle(article: Article) {
    if (busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/platform/knowledge?id=' + encodeURIComponent(article.id), { method: 'DELETE' });
      const result = await response.json() as { article?: { id: string; status: Article['status'] }; error?: string };
      if (!response.ok || !result.article) throw new Error(result.error || 'تعذر أرشفة المقال.');
      setArticles(current => current.map(row => row.id === article.id ? { ...row, status: 'archived' } : row));
      setNotice('تمت أرشفة المقال؛ لم يُحذف سجلّه نهائيًا.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر أرشفة المقال.');
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p className="muted">جارٍ تحميل قاعدة المعرفة...</p>;

  return <div className="grid" style={{ marginTop: 20 }}>
    {error && <div className="card" role="alert">{error}</div>}
    {notice && <div className="card" role="status">{notice}</div>}
    <form className="card" onSubmit={createArticle} style={{ display: 'grid', gap: 10 }}>
      <h2>إنشاء مقال أو مدخل موسوعي</h2>
      <label>العنوان<input required minLength={3} maxLength={200} value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} /></label>
      <label>الرابط اللطيف (a-z, 0-9, -)<input required pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={200} value={draft.slug} onChange={e => setDraft({ ...draft, slug: e.target.value })} /></label>
      <label>التصنيف<input required minLength={1} maxLength={80} value={draft.category} onChange={e => setDraft({ ...draft, category: e.target.value })} /></label>
      <label>ملخص<input maxLength={500} value={draft.excerpt} onChange={e => setDraft({ ...draft, excerpt: e.target.value })} /></label>
      <label>المحتوى<textarea required minLength={1} maxLength={50000} rows={8} value={draft.body} onChange={e => setDraft({ ...draft, body: e.target.value })} /></label>
      <label>عنوان المصدر / المرجع<input maxLength={300} value={draft.sourceTitle} onChange={e => setDraft({ ...draft, sourceTitle: e.target.value })} /></label>
      <label>رابط المصدر (HTTP/HTTPS)<input type="url" maxLength={2048} value={draft.sourceUrl} onChange={e => setDraft({ ...draft, sourceUrl: e.target.value })} /></label>
      <label>الحالة<select value={draft.status} onChange={e => setDraft({ ...draft, status: e.target.value as Article['status'] })}><option value="draft">مسودة</option><option value="published">منشور</option></select></label>
      <button className="btn primary" type="submit" disabled={busy}>{busy ? 'جارٍ الحفظ...' : 'إنشاء المقال'}</button>
    </form>

    <section className="grid two">
      {articles.map(article => <article className="card" key={article.id}>
        <span className="kicker">{article.category} · {article.status}</span>
        <h2>{article.title}</h2>
        <p className="muted">/{article.slug}</p>
        <details>
          <summary>تعديل المحتوى</summary>
          <ArticleEditor article={article} disabled={busy} onSave={patch => void updateArticle(article, patch)} />
        </details>
        {article.status !== 'archived' && <button type="button" style={{ marginTop: 10 }} disabled={busy} onClick={() => void archiveArticle(article)}>أرشفة المقال</button>}
      </article>)}
    </section>
    {!articles.length && <div className="card">لا توجد مقالات في قاعدة المعرفة حتى الآن.</div>}
  </div>;
}

function ArticleEditor({ article, disabled, onSave }: { article: Article; disabled: boolean; onSave: (patch: Partial<Article>) => void }) {
  const [title, setTitle] = useState(article.title);
  const [slug, setSlug] = useState(article.slug);
  const [excerpt, setExcerpt] = useState(article.excerpt);
  const [body, setBody] = useState(article.body);
  const [category, setCategory] = useState(article.category);
  const [sourceTitle, setSourceTitle] = useState(article.source_title ?? '');
  const [sourceUrl, setSourceUrl] = useState(article.source_url ?? '');
  const [status, setStatus] = useState<Article['status']>(article.status);
  return <form onSubmit={event => { event.preventDefault(); onSave({ title, slug, excerpt, body, category, status, source_title: sourceTitle, source_url: sourceUrl }); }} style={{ display: 'grid', gap: 9, marginTop: 12 }}>
    <label>العنوان<input required minLength={3} maxLength={200} value={title} onChange={e => setTitle(e.target.value)} /></label>
    <label>الرابط<input required pattern="[a-z0-9]+(-[a-z0-9]+)*" value={slug} onChange={e => setSlug(e.target.value)} /></label>
    <label>التصنيف<input required maxLength={80} value={category} onChange={e => setCategory(e.target.value)} /></label>
    <label>الملخص<input maxLength={500} value={excerpt} onChange={e => setExcerpt(e.target.value)} /></label>
    <label>المحتوى<textarea required maxLength={50000} rows={7} value={body} onChange={e => setBody(e.target.value)} /></label>
    <label>عنوان المصدر<input maxLength={300} value={sourceTitle} onChange={e => setSourceTitle(e.target.value)} /></label>
    <label>رابط المصدر<input type="url" maxLength={2048} value={sourceUrl} onChange={e => setSourceUrl(e.target.value)} /></label>
    <label>الحالة<select value={status} onChange={e => setStatus(e.target.value as Article['status'])}><option value="draft">مسودة</option><option value="published">منشور</option><option value="archived">مؤرشف</option></select></label>
    <button className="btn primary" type="submit" disabled={disabled}>حفظ التعديل</button>
  </form>;
}
