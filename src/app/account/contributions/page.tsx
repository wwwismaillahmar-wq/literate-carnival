import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import ContributionForm from '@/components/ContributionForm';

const labels: Record<string, string> = {
  suggestion: 'اقتراح',
  design: 'تصميم',
  model: 'نموذج',
  post: 'مشاركة',
};

const statuses: Record<string, string> = {
  pending: 'قيد المراجعة',
  needs_revision: 'تحتاج تعديل',
  accepted: 'مقبولة',
  published: 'منشورة',
  rejected: 'مرفوضة',
};

export default async function ContributionsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login?next=/account/contributions');

  const { data: contributions } = await supabase
    .from('contributions')
    .select('id, type, title, content, status, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  return (
    <main className="section" style={{ minHeight: '70vh' }}>
      <div className="wrap">
        <span className="kicker">ASLAN CONTRIBUTIONS</span>
        <h1>مساهماتي</h1>
        <p className="muted">مساحة مخصصة لكل ما تضيفه إلى منظومة ASLAN. اختر مستوى الظهور وانشر مباشرة، ثم أرفق صورة أو فيديو عند الحاجة.</p>

        <div style={{ marginTop: 28 }}>
          <ContributionForm />
        </div>

        <div className="card" style={{ marginTop: 28 }}>
          <span className="kicker">سجل المساهمات</span>
          <h2>مساهماتي السابقة</h2>

          {contributions && contributions.length > 0 ? (
            <div className="grid" style={{ gap: 14 }}>
              {contributions.map((item) => (
                <article className="card" key={item.id}>
                  <span className="kicker">{labels[item.type] || item.type} · {statuses[item.status] || item.status}</span>
                  <h3>{item.title}</h3>
                  <p>{item.content}</p>
                  <p className="muted">{new Date(item.created_at).toLocaleDateString('ar-DZ')}</p>
                </article>
              ))}
            </div>
          ) : (
            <p className="muted">لا توجد مساهمات بعد. أرسل أول مساهمة من النموذج أعلاه.</p>
          )}
        </div>

        <div style={{ marginTop: 24 }}>
          <Link className="btn secondary" href="/account">← العودة إلى حسابي</Link>
        </div>
      </div>
    </main>
  );
}
