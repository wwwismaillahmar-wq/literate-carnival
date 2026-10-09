'use client';

import { useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { registerProductMedia } from '@/app/admin/actions';

const allowedTypes = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'video/mp4', 'video/webm', 'video/quicktime',
]);
const maxFileSize = 50 * 1024 * 1024;

export default function ProductMediaUploader({ productId }: { productId: number }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const files = Array.from(inputRef.current?.files ?? []);
    if (!files.length) {
      setError('اختر صورة أو فيديو واحدًا على الأقل.');
      return;
    }
    const invalid = files.find((file) => !allowedTypes.has(file.type) || file.size <= 0 || file.size > maxFileSize);
    if (invalid) {
      setError('الملف غير مدعوم أو يتجاوز 50 ميغابايت: ' + invalid.name);
      return;
    }

    setBusy(true);
    setError('');
    setMessage('جارٍ تجهيز رفع الملفات...');
    try {
      const supabase = createClient();
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('انتهت جلسة الدخول. سجّل الدخول مجددًا.');

      let completed = 0;
      for (const file of files) {
        const extension = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin';
        const objectPath = user.id + '/products/' + productId + '/' + crypto.randomUUID() + '.' + extension;
        const { error: uploadError } = await supabase.storage.from('aslan-media').upload(objectPath, file, {
          contentType: file.type,
          upsert: false,
        });
        if (uploadError) throw new Error('فشل رفع ' + file.name + ': ' + uploadError.message);

        const registered = await registerProductMedia({
          productId,
          objectPath,
          mimeType: file.type,
          fileSize: file.size,
        });
        if (!registered.ok) {
          await supabase.storage.from('aslan-media').remove([objectPath]);
          throw new Error(registered.error);
        }
        completed += 1;
        setMessage('تم رفع وربط ' + completed + ' من ' + files.length + ' ملفات.');
      }

      if (inputRef.current) inputRef.current.value = '';
      setMessage('تم رفع جميع الملفات وربطها بالمنتج بنجاح.');
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'حدث خطأ غير معروف أثناء رفع الوسائط.');
    } finally {
      setBusy(false);
    }
  }

  return <form onSubmit={handleSubmit} style={{display:'grid',gap:10,marginTop:12}}>
    <label>إضافة صور أو فيديوهات لهذا المنتج
      <input ref={inputRef} type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime" disabled={busy} />
    </label>
    <small className="muted">يتم الرفع مباشرة إلى التخزين، حتى لا تُرسل الفيديوهات عبر نموذج حفظ المنتج. الحد الأقصى لكل ملف 50 ميغابايت.</small>
    <button type="submit" disabled={busy}>{busy ? 'جارٍ رفع الملفات…' : 'رفع وربط الوسائط'}</button>
    {message && <p role="status" className="muted">{message}</p>}
    {error && <p role="alert" style={{color:'#ef8b8b'}}>{error}</p>}
  </form>;
}
