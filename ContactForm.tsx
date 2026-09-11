'use client';

import { useState } from 'react';
import { whatsappLink } from '@/lib/config';

type Classification = {
  classification?: string;
  priority?: string;
  reason?: string;
} | null;

export function ContactForm({ initialType }: { initialType: string }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [type, setType] = useState(initialType);
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    const cleanName = name.trim();
    const cleanPhone = phone.trim();
    const cleanMessage = message.trim();
    const cleanType = type.trim();

    if (
      cleanName.length < 2 ||
      cleanName.length > 120 ||
      cleanPhone.length < 6 ||
      cleanPhone.length > 30 ||
      cleanMessage.length < 5 ||
      cleanMessage.length > 4000
    ) {
      setStatus('يرجى إكمال البيانات المطلوبة بشكل صحيح.');
      return;
    }

    setSubmitting(true);
    setStatus('جاري تحليل طلبك وتسجيله...');

    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: cleanName,
          phone: cleanPhone,
          type: cleanType,
          message: cleanMessage,
        }),
      });

      const data = (await response.json().catch(() => null)) as
        | { ok?: boolean; error?: string; classification?: Classification }
        | null;

      if (!response.ok || !data?.ok) {
        throw new Error(data?.error || 'تعذر تسجيل الطلب.');
      }

      setStatus('تم تسجيل الطلب وتحليله. سيتم فتح واتساب للمتابعة.');
    } catch (error) {
      console.error('lead submission failed:', error);
      setStatus('تعذر تسجيل الطلب في النظام، لكن سيتم فتح واتساب للمتابعة.');
    } finally {
      window.location.assign(
        whatsappLink(
          `مرحباً ASLAN MODELLING،\nالاسم: ${cleanName}\nالهاتف: ${cleanPhone}\nنوع الطلب: ${cleanType}\nالتفاصيل: ${cleanMessage}`,
        ),
      );
    }
  }

  return (
    <form
      onSubmit={submit}
      className="card"
      style={{ display: 'grid', gap: 13, maxWidth: 720 }}
      noValidate
    >
      <label>
        <span className="sr-only">الاسم الكامل</span>
        <input
          required
          minLength={2}
          maxLength={120}
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="الاسم الكامل"
          autoComplete="name"
        />
      </label>

      <label>
        <span className="sr-only">رقم الهاتف</span>
        <input
          required
          minLength={6}
          maxLength={30}
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          placeholder="رقم الهاتف"
          inputMode="tel"
          autoComplete="tel"
        />
      </label>

      <label>
        <span className="sr-only">نوع الطلب</span>
        <select value={type} onChange={(event) => setType(event.target.value)}>
          <option>طلب منتج</option>
          <option>طلب خدمة</option>
          <option>دورة تكوينية</option>
          <option>طلب شراكة</option>
          <option>استعلام</option>
          <option>شكوى / اقتراح</option>
        </select>
      </label>

      <label>
        <span className="sr-only">تفاصيل الطلب</span>
        <textarea
          required
          minLength={5}
          maxLength={4000}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          rows={6}
          placeholder="تفاصيل الطلب"
        />
      </label>

      <button className="btn primary" type="submit" disabled={submitting}>
        {submitting ? 'جاري المعالجة...' : 'إرسال الطلب'}
      </button>

      {status && (
        <p className="muted" role="status" aria-live="polite">
          {status}
        </p>
      )}
    </form>
  );
}
