'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import VisibilitySelect from '@/components/VisibilitySelect';

export default function PostForm() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'friends' | 'private'>('public');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage('');

    const response = await fetch('/api/account/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, content, visibility }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      setMessage(data.error || 'تعذر إرسال المنشور.');
      setLoading(false);
      return;
    }

    setTitle('');
    setContent('');
    setMessage('تم إرسال المنشور للمراجعة.');
    setLoading(false);
    router.refresh();
  }

  return (
    <form className="card" onSubmit={submit} style={{ display: 'grid', gap: 14 }}>
      <span className="kicker">منشور جديد</span>
      <label>العنوان<input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={160} required /></label>
      <label>المحتوى<textarea value={content} onChange={(e) => setContent(e.target.value)} maxLength={5000} rows={7} required /></label>
      <VisibilitySelect value={visibility} onChange={setVisibility} />
      <button className="btn primary" type="submit" disabled={loading}>{loading ? 'جارٍ الإرسال...' : 'إرسال المنشور'}</button>
      {message && <p className="muted" role="status">{message}</p>}
    </form>
  );
}
