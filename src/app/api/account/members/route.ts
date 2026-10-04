import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'يجب تسجيل الدخول أولًا.' }, { status: 401 });

  const q = new URL(request.url).searchParams.get('q')?.trim() ?? '';
  let query = supabase
    .from('profiles')
    .select('id, full_name, username, avatar_path, role, created_at')
    .neq('id', user.id)
    .order('created_at', { ascending: false })
    .limit(30);

  if (q) {
    const escaped = q.replace(/[\%_]/g, '\$&');
    query = query.or(`full_name.ilike.%${escaped}%,username.ilike.%${escaped}%`);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: 'تعذر البحث عن الأعضاء.' }, { status: 500 });

  const members = [];
  for (const profile of data ?? []) {
    let avatar_url: string | null = null;
    if (profile.avatar_path) {
      const signed = await supabase.storage.from('aslan-media').createSignedUrl(profile.avatar_path, 3600);
      avatar_url = signed.data?.signedUrl ?? null;
    }
    members.push({ ...profile, avatar_url });
  }

  return NextResponse.json({ members });
}
