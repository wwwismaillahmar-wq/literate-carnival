'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import VisibilitySelect from '@/components/VisibilitySelect';
import MediaUploader from '@/components/MediaUploader';

export default function PostForm() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'friends' | 'private'>('public');
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/account/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content, visibility }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setMessage(data.error || 'تعذر نشر المنشور.');
        return;
      }

      setCreatedId(data.post?.id || null);
      setTitle('');
      setContent('');
      setMessage('تم نشر المنشور بنجاح. يمكنك الآن إرفاق صورة أو فيديو.');
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
        <span className="kicker">منشور جديد</span>
        <label>
          العنوان
          <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={160} required />
        </label>
        <label>
          المحتوى
          <textarea value={content} onChange={(event) => setContent(event.target.value)} maxLength={5000} rows={7} required />
        </label>
        <VisibilitySelect value={visibility} onChange={setVisibility} />
        <button className="btn primary" type="submit" disabled={loading}>
          {loading ? 'جارٍ النشر...' : 'نشر المنشور'}
        </button>
        {message && <p className="muted" role="status">{message}</p>}
      </form>

      {createdId && <MediaUploader postId={createdId} />}
    </div>
  );
}
