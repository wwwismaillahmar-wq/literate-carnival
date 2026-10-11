import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type Row = Record<string, unknown>;
const text = (row: Row, ...keys: string[]) => keys.map((key) => row[key]).find((v) => typeof v === 'string' && v.trim()) as string | undefined;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = (url.searchParams.get('q') ?? '').trim().slice(0, 120);
  const kind = (url.searchParams.get('type') ?? 'all').trim();
  if (!['all','products','services','courses','content','knowledge'].includes(kind)) return NextResponse.json({ error: 'نوع البحث غير صالح.', results: [] }, { status: 400 });
  const page = Math.max(1, Math.min(1000, Number(url.searchParams.get('page') ?? 1) || 1));
  const limit = Math.max(1, Math.min(50, Number(url.searchParams.get('limit') ?? 20) || 20));
  if (q.length < 2) return NextResponse.json({ error: 'أدخل حرفين على الأقل للبحث.', results: [], page, limit }, { status: 400 });

  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  const sources = [
    { key: 'products', label: 'product', enabled: kind === 'all' || kind === 'products', run: () => db.from('products').select('*').eq('active', true).limit(250) },
    { key: 'services', label: 'service', enabled: kind === 'all' || kind === 'services', run: () => db.from('services').select('*').limit(250) },
    { key: 'courses', label: 'course', enabled: kind === 'all' || kind === 'courses', run: () => db.from('courses').select('*').limit(250) },
    { key: 'posts', label: 'content', enabled: kind === 'all' || kind === 'content', run: () => db.from('posts').select('*').eq('status', 'published').eq('visibility', 'public').limit(250) },
    { key: 'contributions', label: 'content', enabled: kind === 'all' || kind === 'content', run: () => db.from('contributions').select('*').eq('status', 'published').eq('visibility', 'public').limit(250) },
    { key: 'knowledge_articles', label: 'knowledge', enabled: kind === 'all' || kind === 'knowledge', run: () => db.from('knowledge_articles').select('id,slug,title,excerpt,category,status,published_at').eq('status', 'published').limit(250) },
  ];
  const responses = await Promise.all(sources.filter((s) => s.enabled).map(async (source) => ({ source, response: await source.run() })));
  const needle = q.toLocaleLowerCase();
  const unavailableSources: string[] = [];
  const all: Array<{ id: string; type: string; title: string; description: string; href: string; created_at?: string }> = [];
  for (const { source, response } of responses) {
    if (response.error) { unavailableSources.push(source.key); continue; }
    for (const raw of (response.data ?? []) as Row[]) {
      const title = text(raw, 'name', 'title', 'service_name', 'course_name', 'subject') ?? '';
      const description = text(raw, 'description', 'excerpt', 'summary', 'content', 'body') ?? '';
      const haystack = (title + ' ' + description + ' ' + (text(raw, 'category', 'type') ?? '')).toLocaleLowerCase();
      if (!title || !haystack.includes(needle)) continue;
      const id = String(raw.id ?? raw.slug ?? '');
      if (!id) continue;
      const href = source.key === 'products' ? '/products/' + encodeURIComponent(String(raw.slug ?? id))
        : source.key === 'services' ? '/services'
        : source.key === 'courses' ? '/academy'
        : source.key === 'knowledge_articles' ? '/knowledge/' + encodeURIComponent(String(raw.slug ?? id))
        : '/community';
      all.push({ id: source.key + ':' + id, type: source.label, title, description: description.slice(0, 320), href, created_at: text(raw, 'created_at', 'published_at') });
    }
  }
  all.sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''));
  const start = (page - 1) * limit;
  const results = all.slice(start, start + limit);
  if (user) {
    await db.from('platform_search_events').insert({
      user_id: user.id,
      query_hash: createHash('sha256').update(q.toLocaleLowerCase()).digest('hex'),
      result_count: all.length,
      filters: { type: kind, page, limit },
    });
  }
  return NextResponse.json({ query: q, results, total: all.length, page, limit, pages: Math.ceil(all.length / limit), unavailableSources }, { status: unavailableSources.length ? 206 : 200 });
}
