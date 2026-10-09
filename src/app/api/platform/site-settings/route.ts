import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
const settingRules: Record<string, { max: number; pattern?: RegExp }> = {
  brand_tagline: { max: 180 },
  brand_gold: { max: 20, pattern: /^#[0-9a-f]{6}$/i },
  home_eyebrow: { max: 100 },
  home_title_primary: { max: 180 },
  home_title_accent: { max: 180 },
  home_subtitle: { max: 1000 },
  announcement_text: { max: 500 },
  footer_text: { max: 300 },
  contact_phone: { max: 30 },
  contact_email: { max: 254, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
  contact_address: { max: 300 },
  brand_logo_path: { max: 500, pattern: /^(?!.*\.\.)[a-zA-Z0-9/_.-]*$/ },
};

async function admin(db: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await db.auth.getUser();
  if (!user) return { user: null, allowed: false };
  const { data, error } = await db.rpc('has_role', { role_key: 'super_admin' });
  return { user, allowed: !error && data === true };
}

export async function GET() {
  const db = await createClient();
  const { user, allowed } = await admin(db);
  let query = db.from('site_settings').select('setting_key,setting_value,is_public,updated_at').order('setting_key');
  if (!user || !allowed) query = query.eq('is_public', true);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: 'تعذر تحميل إعدادات الموقع.' }, { status: 500 });
  return NextResponse.json({
    settings: Object.fromEntries((data ?? []).map(row => [row.setting_key, row.setting_value])),
    admin: allowed,
  });
}

export async function PATCH(request: Request) {
  try {
    const db = await createClient();
    const { user, allowed } = await admin(db);
    if (!user) return NextResponse.json({ error: 'يجب تسجيل الدخول.' }, { status: 401 });
    if (!allowed) return NextResponse.json({ error: 'تعديل إعدادات الموقع للإدارة العليا فقط.' }, { status: 403 });
    const body = await request.json();
    const values = body && typeof body === 'object' && body.settings && typeof body.settings === 'object' ? body.settings as Record<string, unknown> : null;
    if (!values || !Object.keys(values).length || Object.keys(values).length > 30) {
      return NextResponse.json({ error: 'قائمة الإعدادات غير صالحة.' }, { status: 400 });
    }
    const rows: { setting_key: string; setting_value: string; is_public: boolean; updated_by: string; updated_at: string }[] = [];
    for (const [key, rawValue] of Object.entries(values)) {
      const rule = settingRules[key];
      if (!rule || typeof rawValue !== 'string') return NextResponse.json({ error: 'مفتاح إعداد غير مسموح: ' + key }, { status: 400 });
      const value = rawValue.trim();
      if (value.length > rule.max || (value && rule.pattern && !rule.pattern.test(value))) {
        return NextResponse.json({ error: 'قيمة الإعداد غير صالحة: ' + key }, { status: 400 });
      }
      rows.push({ setting_key: key, setting_value: value, is_public: true, updated_by: user.id, updated_at: new Date().toISOString() });
    }
    const { data, error } = await db.from('site_settings').upsert(rows, { onConflict: 'setting_key' })
      .select('setting_key,setting_value,updated_at');
    if (error) return NextResponse.json({ error: 'تعذر حفظ إعدادات الموقع.' }, { status: 500 });
    return NextResponse.json({ settings: Object.fromEntries((data ?? []).map(row => [row.setting_key, row.setting_value])) });
  } catch {
    return NextResponse.json({ error: 'صيغة الطلب غير صالحة.' }, { status: 400 });
  }
}
