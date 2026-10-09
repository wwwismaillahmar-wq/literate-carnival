import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: 'يجب تسجيل الدخول.' }, { status: 401 });
  const { data: allowed, error: authError } = await db.rpc('has_role', { role_key: 'super_admin' });
  if (authError || allowed !== true) return NextResponse.json({ error: 'عرض كتالوج الإدارة غير مصرح.' }, { status: 403 });
  const { data, error } = await db.from('courses').select('*').limit(100);
  if (error) return NextResponse.json({ error: 'تعذر تحميل الدورات؛ تحقق من مخطط courses الحالي.' }, { status: 500 });
  const courses = (data ?? []).map((row: Record<string, unknown>) => ({
    id: String(row.id ?? ''),
    title: [row.title, row.name, row.course_name].find(value => typeof value === 'string' && value.trim()) ?? String(row.id ?? 'دورة بلا عنوان'),
    description: [row.description, row.summary].find(value => typeof value === 'string' && value.trim()) ?? '',
    status: typeof row.status === 'string' ? row.status : typeof row.published === 'boolean' ? (row.published ? 'published' : 'draft') : typeof row.active === 'boolean' ? (row.active ? 'active' : 'inactive') : 'unknown',
  })).filter(course => course.id);
  return NextResponse.json({ courses });
}
