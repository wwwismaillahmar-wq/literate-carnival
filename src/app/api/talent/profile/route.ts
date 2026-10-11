import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: 'يجب تسجيل الدخول.' }, { status: 401 });
  const { data, error } = await db.from('talent_profiles')
    .select('id,user_id,headline,bio,skills,public_profile,review_status,reviewed_at,created_at,updated_at')
    .eq('user_id', user.id).maybeSingle();
  if (error) return NextResponse.json({ error: 'تعذر تحميل الملف المهني.' }, { status: 500 });
  const evidence = data ? await db.from('talent_evidence')
    .select('id,title,evidence_type,evidence_url,notes,verification_status,verified_at,created_at')
    .eq('profile_id', data.id).order('created_at', { ascending: false }) : { data: [], error: null };
  if (evidence.error) return NextResponse.json({ error: 'تعذر تحميل أدلة الخبرة.' }, { status: 500 });
  return NextResponse.json({ profile: data ?? null, evidence: evidence.data ?? [] });
}

export async function POST(request: Request) {
  try {
    const db = await createClient();
    const { data: { user } } = await db.auth.getUser();
    if (!user) return NextResponse.json({ error: 'يجب تسجيل الدخول لإنشاء الملف المهني.' }, { status: 401 });
    const body = await request.json();
    const headline = typeof body.headline === 'string' ? body.headline.trim() : '';
    const bio = typeof body.bio === 'string' ? body.bio.trim() : '';
    const skills = Array.isArray(body.skills) ? body.skills : [];
    const publicProfile = body.publicProfile === true;
    const submitForReview = body.submitForReview === true;
    if (headline.length > 160 || bio.length > 4000 || skills.length > 40 ||
        skills.some((skill: unknown) => typeof skill !== 'string' || skill.trim().length < 1 || skill.trim().length > 60)) {
      return NextResponse.json({ error: 'تحقق من العنوان المهني والسيرة والمهارات (حتى 40 مهارة).' }, { status: 400 });
    }
    const normalizedSkills = [...new Set((skills as string[]).map(skill => skill.trim()))];
    const { data, error } = await db.from('talent_profiles').upsert({
      user_id: user.id,
      headline,
      bio,
      skills: normalizedSkills,
      public_profile: publicProfile,
      review_status: submitForReview ? 'pending' : 'draft',
      reviewed_by: null,
      reviewed_at: null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
      .select('id,user_id,headline,bio,skills,public_profile,review_status,reviewed_at,created_at,updated_at')
      .single();
    if (error) return NextResponse.json({ error: 'تعذر حفظ الملف المهني.' }, { status: 500 });
    return NextResponse.json({ profile: data }, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'صيغة الطلب غير صالحة.' }, { status: 400 });
  }
}
