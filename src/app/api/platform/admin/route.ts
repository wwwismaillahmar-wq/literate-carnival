import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
const domains = [
  ['products', 'السوق والمنتجات'], ['services', 'الخدمات'], ['profiles', 'المستخدمون'],
  ['posts', 'المنشورات'], ['contributions', 'المساهمات'], ['support_tickets', 'الدعم والشكاوى'],
  ['platform_notifications', 'الإشعارات'], ['knowledge_articles', 'قاعدة المعرفة'],
  ['platform_ai_requests', 'طلبات الذكاء الاصطناعي'], ['analytics_events', 'أحداث التحليلات'],
] as const;

export async function GET() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: 'يجب تسجيل الدخول.' }, { status: 401 });
  const { data: isAdmin, error: roleError } = await db.rpc('has_role', { role_key: 'super_admin' });
  if (roleError || isAdmin !== true) return NextResponse.json({ error: 'هذه اللوحة مخصصة للإدارة العليا.' }, { status: 403 });
  const metrics = await Promise.all(domains.map(async ([table, label]) => {
    const { count, error } = await db.from(table).select('*', { count: 'exact', head: true });
    return { table, label, count: error ? null : count ?? 0, error: error ? 'تعذر قراءة المؤشر من قاعدة البيانات.' : null };
  }));
  const { data: recentAi, error: aiError } = await db.from('platform_ai_requests').select('id,feature,model,status,error_code,created_at').order('created_at', { ascending: false }).limit(10);
  const { data: recentArticles, error: articlesError } = await db.from('knowledge_articles').select('id,title,status,updated_at').order('updated_at', { ascending: false }).limit(10);
  return NextResponse.json({
    generatedAt: new Date().toISOString(), actor: user.id, metrics,
    recentAiRequests: aiError ? null : recentAi ?? [],
    recentKnowledgeArticles: articlesError ? null : recentArticles ?? [],
    partial: metrics.some((metric) => metric.error) || !!aiError || !!articlesError,
  });
}
