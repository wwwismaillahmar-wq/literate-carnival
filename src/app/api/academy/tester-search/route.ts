import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: 'يجب تسجيل الدخول.' }, { status: 401 });
  const { data: allowed, error: authError } = await db.rpc('has_role', { role_key: 'super_admin' });
  if (authError || allowed !== true) return NextResponse.json({ error: 'غير مصرح.' }, { status: 403 });
  const q = (new URL(request.url).searchParams.get('q') ?? '').trim();
  if (q.length < 2 || q.length > 80) return NextResponse.json({ users: [] });
  const safe = q.replace(/[%,().*]/g, '');
  if (safe.length < 2) return NextResponse.json({ users: [] });
  const { data, error } = await db.from('profiles')
    .select('id,full_name,username')
    .or('full_name.ilike.%' + safe + '%,username.ilike.%' + safe + '%')
    .limit(20);
  if (error) return NextResponse.json({ error: 'تعذر البحث عن المستخدمين.' }, { status: 500 });
  return NextResponse.json({ users: data ?? [] });
}
