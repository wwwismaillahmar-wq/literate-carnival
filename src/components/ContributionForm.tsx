'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import VisibilitySelect from '@/components/VisibilitySelect';
import MediaUploader from '@/components/MediaUploader';

const types = [['suggestion', 'اقتراح'], ['design', 'تصميم'], ['model', 'نموذج'], ['post', 'مشاركة']];

export default function ContributionForm() {
  const router = useRouter();
  const [type, setType] = useState('suggestion');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'friends' | 'private'>('private');
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/account/contributions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, title, content, visibility }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setMessage(data.error || 'تعذر نشر المساهمة.');
        return;
      }

      setCreatedId(data.contribution?.id || null);
      setTitle('');
      setContent('');
      setMessage('تم نشر المساهمة بنجاح. يمكنك الآن إرفاق صورة أو فيديو.');
      router.refresh();
    } catch {
      setMessage('تعذر الاتصال بالخادم. حاول مرة أخرى.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <form className="card" onSubmit={submit} style={{ display: 'grid', gap: 14 }}>
        <span className="kicker">إضافة مساهمة</span>
        <label>
          نوع المساهمة
          <select value={type} onChange={(event) => setType(event.target.value)}>
            {types.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
          </select>
        </label>
        <label>
          العنوان
          <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={160} required placeholder="عنوان واضح للمساهمة" />
        </label>
        <label>
          المحتوى
          <textarea value={content} onChange={(event) => setContent(event.target.value)} maxLength={5000} required rows={7} placeholder="اكتب اقتراحك أو فكرتك أو مشاركتك..." />
        </label>
        <VisibilitySelect value={visibility} onChange={setVisibility} />
        <button className="btn primary" type="submit" disabled={loading}>
          {loading ? 'جارٍ النشر...' : 'نشر المساهمة'}
        </button>
        {message && <p className="muted" role="status">{message}</p>}
      </form>

      {createdId && <MediaUploader contributionId={createdId} />}
    </div>
  );
}
