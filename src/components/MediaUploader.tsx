'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type Props = { postId?: string; contributionId?: string };
const MAX_FILE_SIZE = 50 * 1024 * 1024;

export default function MediaUploader({ postId, contributionId }: Props) {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function upload(event: React.ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;

    const mediaType = file.type.startsWith('video/') ? 'video' : file.type.startsWith('image/') ? 'image' : '';
    if (!mediaType) { setMessage('اختر صورة أو فيديو.'); input.value=''; return; }
    if (file.size > MAX_FILE_SIZE) { setMessage('حجم الملف يتجاوز 50MB.'); input.value=''; return; }

    setLoading(true);
    setMessage('جارٍ رفع الملف...');

    try {
      const init = await fetch('/api/account/media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, contributionId, mediaType, mimeType: file.type, fileSize: file.size }),
      });
      const data = await init.json().catch(() => ({}));

      if (!init.ok || !data.asset?.object_path) {
        setMessage(data.error || 'تعذر تهيئة رفع الملف.');
        return;
      }

      const supabase = createClient();
      const { error } = await supabase.storage.from('aslan-media').upload(
        data.asset.object_path,
        file,
        { contentType: file.type, cacheControl: '3600', upsert: false },
      );

      if (error) {
        await fetch('/api/account/media?assetId=' + encodeURIComponent(data.asset.id), { method: 'DELETE' }).catch(() => undefined);
        setMessage('تعذر رفع الملف: ' + error.message);
        return;
      }

      setMessage('تم رفع الملف بنجاح.');
      input.value = '';
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? 'تعذر رفع الملف: ' + error.message : 'تعذر رفع الملف.');
    } finally {
      setLoading(false);
    }
  }

  return <div className="card" style={{ display:'grid', gap:10 }}>
    <span className="kicker">الصور والفيديو</span>
    <input type="file" accept="image/*,video/*" onChange={upload} disabled={loading} />
    <p className="muted">{loading ? 'جارٍ رفع الملف...' : message || 'الحد الحالي 50MB لكل ملف.'}</p>
  </div>;
}
