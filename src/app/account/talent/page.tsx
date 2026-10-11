import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { TalentProfileWorkspace } from '@/components/TalentProfileWorkspace';

export const dynamic = 'force-dynamic';

export default async function TalentAccountPage() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/login?next=/account/talent');

  return (
    <main className="section">
      <div className="wrap">
        <Link href="/account">← الحساب</Link>
        <span className="kicker" style={{ display: 'block', marginTop: 24 }}>TALENT / PROFILE</span>
        <h1>ملفي المهني</h1>
        <p className="muted">أنت تتحكم في الملف؛ أما التوثيق وإظهار الأدلة للعموم فيخضعان للمراجعة.</p>
        <TalentProfileWorkspace />
      </div>
    </main>
  );
}
