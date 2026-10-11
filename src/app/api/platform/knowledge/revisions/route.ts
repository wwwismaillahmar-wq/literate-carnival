import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: 'يجب تسجيل الدخول.' }, { status: 401 });
  const { data: allowed, error: roleError } = await db.rpc('has_role', { role_key: 'super_admin' });
  if (roleError || allowed !== true) return NextResponse.json({ error: 'سجل مراجعات المعرفة للإدارة العليا فقط.' }, { status: 403 });
  const id = new URL(request.url).searchParams.get('articleId')?.trim() ?? '';
  if (!id) return NextResponse.json({ error: 'معرّف المقال مطلوب.' }, { status: 400 });
  const { data, error } = await db.from('knowledge_article_revisions')
    .select('id,article_id,revision_number,snapshot,edited_by,created_at')
    .eq('article_id', id).order('revision_number', { ascending: false }).limit(100);
  if (error) return NextResponse.json({ error: 'تعذر تحميل سجل المراجعات؛ تحقق من ترحيل M37.' }, { status: 500 });
  return NextResponse.json({ revisions: data ?? [] });
}
