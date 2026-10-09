import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function TalentDirectoryPage() {
  const db = await createClient();
  const { data: profiles, error } = await db.from('talent_profiles')
    .select('id,headline,bio,skills,updated_at')
    .eq('public_profile', true)
    .eq('review_status', 'verified')
    .order('updated_at', { ascending: false })
    .limit(100);

  return (
    <main className="section">
      <div className="wrap">
        <span className="kicker">TALENT / M35</span>
        <h1>الكفاءات المهنية الموثقة</h1>
        <p className="muted">لا يظهر في الدليل إلا الملف الذي اختار صاحبه إتاحته للعموم واجتاز مراجعة ASLAN.</p>
        {error && <div className="card" role="alert">تعذر تحميل الدليل المهني؛ لم نعرض بيانات بديلة على أنها حقيقية.</div>}
        {!error && !profiles?.length && <div className="card">لا توجد ملفات مهنية موثقة ومتاحة للعموم حاليًا.</div>}
        <section className="grid three" style={{ marginTop: 24 }}>
          {(profiles ?? []).map(profile => (
            <article className="card" key={profile.id}>
              <span className="kicker">VERIFIED PROFILE</span>
              <h2>{profile.headline || 'كفاءة مهنية موثقة'}</h2>
              <p className="muted">{profile.bio}</p>
              {!!profile.skills?.length && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{profile.skills.map((skill: string) => <span className="btn secondary" key={skill}>{skill}</span>)}</div>}
            </article>
          ))}
        </section>
        <section className="card" style={{ marginTop: 24 }}>
          <h2>أنشئ ملفك المهني</h2>
          <p className="muted">أضف مهاراتك وأدلتك المهنية، ثم أرسل الملف للمراجعة. لا تمنح المنصة التوثيق تلقائيًا.</p>
          <Link className="btn primary" href="/account/talent">إدارة ملفي المهني</Link>
        </section>
      </div>
    </main>
  );
}
