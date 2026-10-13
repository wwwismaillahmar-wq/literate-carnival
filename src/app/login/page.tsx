'use client';

import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [returnTo,setReturnTo] = useState('/');
  useEffect(()=>{const value=new URLSearchParams(window.location.search).get('next');if(value && value.startsWith('/') && !value.startsWith('//') && !value.includes(String.fromCharCode(92)))setReturnTo(value);},[]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const requestedNext = new URLSearchParams(window.location.search).get('next');
      const next =
        requestedNext &&
        requestedNext.startsWith('/') &&
        !requestedNext.startsWith('//') && !requestedNext.includes(String.fromCharCode(92))
          ? requestedNext
          : '/';

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || 'تعذر تسجيل الدخول.');
        return;
      }

      setPassword('');
      router.replace(next);
      router.refresh();
    } catch {
      setError('تعذر الاتصال بخدمة الحسابات. حاول مرة أخرى.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="section" style={{ minHeight: '75vh', display: 'grid', placeItems: 'center' }}>
      <form className="card" onSubmit={submit} style={{ width: 'min(430px, 100%)', display: 'grid', gap: 14 }}>
        <span className="kicker">ASLAN ACCOUNT</span>
        <h1>تسجيل الدخول</h1>

        <input
          required
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="البريد الإلكتروني"
          autoComplete="email"
        />

        <input
          required
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="كلمة السر"
          autoComplete="current-password"
        />

        <button className="btn primary" type="submit" disabled={loading}>
          {loading ? 'جارٍ الدخول...' : 'دخول'}
        </button>

        {error && <p style={{ color: '#ef8b8b' }}>{error}</p>}

        <p>
          لا تملك حسابًا؟ <Link href={'/register?next='+encodeURIComponent(returnTo)}>إنشاء حساب</Link>
        </p>
      </form>
    </main>
  );
}
