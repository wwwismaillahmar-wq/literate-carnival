'use client';

import { useEffect, useState } from 'react';

type Profile = { id: string; user_id: string; headline: string; bio: string; skills: string[]; public_profile: boolean; review_status: string; reviewed_at: string | null };

export function TalentProfileReviewWorkspace() {
  const [items, setItems] = useState<Profile[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch('/api/talent/review', { cache: 'no-store' });
        const result = await response.json() as { profiles?: Profile[]; error?: string };
        if (!response.ok) throw new Error(result.error || 'تعذر تحميل الملفات.');
        setItems(result.profiles ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'تعذر تحميل الملفات.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function review(profile: Profile, status: 'verified' | 'rejected' | 'pending') {
    setBusyId(profile.id);
    setError('');
    try {
      const response = await fetch('/api/talent/review', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: profile.id, status }),
      });
      const result = await response.json() as { profile?: Profile; error?: string };
      if (!response.ok || !result.profile) throw new Error(result.error || 'تعذر حفظ المراجعة.');
      setItems(current => current.map(item => item.id === profile.id ? { ...item, ...result.profile } : item));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر حفظ المراجعة.');
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <p className="muted">جارٍ تحميل الملفات المهنية...</p>;
  return <section className="grid" style={{ marginTop: 20 }}>
    {error && <div className="card" role="alert">{error}</div>}
    {!items.length && <div className="card">لا توجد ملفات مهنية مقدمة للمراجعة.</div>}
    {items.map(profile => <article className="card" key={profile.id}>
      <span className="kicker">{profile.review_status} · {profile.public_profile ? 'طلب إتاحة عامة' : 'غير متاح للعموم'}</span>
      <h2>{profile.headline || 'ملف مهني دون عنوان'}</h2>
      <p className="muted">معرّف الحساب: {profile.user_id}</p>
      <p>{profile.bio}</p>
      {!!profile.skills?.length && <p className="muted">المهارات: {profile.skills.join('، ')}</p>}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button type="button" className="btn primary" disabled={busyId === profile.id || !profile.public_profile} onClick={() => void review(profile, 'verified')}>توثيق الملف</button>
        <button type="button" disabled={busyId === profile.id} onClick={() => void review(profile, 'rejected')}>طلب تعديل / رفض</button>
        {profile.review_status !== 'pending' && <button type="button" disabled={busyId === profile.id} onClick={() => void review(profile, 'pending')}>إعادة للمراجعة</button>}
      </div>
      {!profile.public_profile && <p className="muted">لا يمكن نشر هذا الملف؛ لم يوافق صاحبه على العرض العام.</p>}
    </article>)}
  </section>;
}
