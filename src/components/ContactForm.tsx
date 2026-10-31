'use client';

import { useState } from 'react';
import { trainingFields, type AcademyCourse } from '@/lib/academy/catalog';


type Classification = {
  classification?: string;
  priority?: string;
  reason?: string;
} | null;

export function ContactForm({ initialType, courses = [] }: { initialType: string; courses?: AcademyCourse[] }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [type, setType] = useState(initialType);
  const [message, setMessage] = useState('');
  const [field,setField] = useState('');
  const [courseId,setCourseId] = useState('');
  const [consultation,setConsultation] = useState(false);
  const [reference,setReference] = useState<string | null>(null);
  const available = courses.filter(course=>!field || course.field===field);
  const [status, setStatus] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    const cleanName = name.trim();
    const cleanPhone = phone.trim();
    const chosen = courses.find(course=>course.id===courseId && (!field || course.field===field));
    const cleanMessage = message.trim() || (type==='دورة تكوينية' ? 'أرغب في الحصول على استشارة تعليمية حول الدورات المتاحة.' : '');
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

    setReference(null);
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
          courseId: type==='دورة تكوينية' && !consultation ? chosen?.id : undefined,
          trainingField: type==='دورة تكوينية' ? field : undefined,
          consultation: type==='دورة تكوينية' ? consultation : undefined,
        }),
      });

      const data = (await response.json().catch(() => null)) as
        | { ok?: boolean; error?: string; classification?: Classification; reference?: string }
        | null;

      if (!response.ok || !data?.ok) {
        throw new Error(data?.error || 'تعذر تسجيل الطلب.');
      }

      setReference(data.reference || null);
      setStatus('تم استلام طلبك داخل منصة ASLAN بنجاح. ستراجعه الإدارة وتتواصل معك عبر بيانات الاتصال المقدمة.');
      setMessage('');
    } catch (error) {
      console.error('lead submission failed:', error);
      setStatus('تعذر تسجيل الطلب داخل المنصة. يرجى إعادة المحاولة لاحقًا؛ لم يتم تأكيد استلامه.');
    } finally {
      setSubmitting(false);
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

      {type==='دورة تكوينية' && <div style={{display:'grid',gap:12}}>
        <label>مجال التكوين
          <select value={field} onChange={event=>{setField(event.target.value);setCourseId('');}}>
            <option value="">كل المجالات</option>
            {trainingFields.map(item=><option key={item.id} value={item.id}>{item.title}</option>)}
            <option value="general">تكوين مهني عام</option>
          </select>
        </label>
        <label>الدورة المطلوبة
          <select value={courseId} disabled={consultation} onChange={event=>setCourseId(event.target.value)}>
            <option value="">لم أحدد دورة بعد</option>
            {available.map(course=><option key={course.id} value={course.id}>{course.title}</option>)}
          </select>
        </label>
        <label><input type="checkbox" checked={consultation} onChange={event=>{setConsultation(event.target.checked);if(event.target.checked)setCourseId('');}}/> لا أعرف الدورة المناسبة / أحتاج إلى استشارة تعليمية</label>
      </div>}
      <label>
        <span className="sr-only">تفاصيل الطلب</span>
        <textarea
          required={type!=='دورة تكوينية'}
          minLength={type==='دورة تكوينية'?0:5}
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

      {reference && <p role="status"><strong>رقم الطلب: {reference}</strong></p>}
      {status && (
        <p className="muted" role="status" aria-live="polite">
          {status}
        </p>
      )}
    </form>
  );
}
