'use client';

import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAslanLanguage } from '@/components/AslanLocale';
const labels={
 ar:{title:'تسجيل الدخول',email:'البريد الإلكتروني',password:'كلمة السر',loading:'جارٍ الدخول...',submit:'دخول',missing:'تعذر تسجيل الدخول.',network:'تعذر الاتصال بخدمة الحسابات. حاول مرة أخرى.',register:'إنشاء حساب',noAccount:'لا تملك حسابًا؟'},
 fr:{title:'Connexion',email:'Adresse e-mail',password:'Mot de passe',loading:'Connexion...',submit:'Se connecter',missing:'Connexion impossible.',network:'Service indisponible. Réessayez.',register:'Créer un compte',noAccount:'Pas de compte ?'},
 en:{title:'Sign in',email:'Email address',password:'Password',loading:'Signing in...',submit:'Sign in',missing:'Unable to sign in.',network:'Account service unavailable. Try again.',register:'Create account',noAccount:'No account?'},
 es:{title:'Iniciar sesión',email:'Correo electrónico',password:'Contraseña',loading:'Iniciando sesión...',submit:'Entrar',missing:'No se pudo iniciar sesión.',network:'Servicio no disponible. Inténtalo de nuevo.',register:'Crear cuenta',noAccount:'¿No tienes cuenta?'},
 de:{title:'Anmelden',email:'E-Mail-Adresse',password:'Passwort',loading:'Anmeldung läuft...',submit:'Anmelden',missing:'Anmeldung fehlgeschlagen.',network:'Dienst nicht erreichbar. Bitte erneut versuchen.',register:'Konto erstellen',noAccount:'Noch kein Konto?'},
 pt:{title:'Entrar',email:'E-mail',password:'Senha',loading:'Entrando...',submit:'Entrar',missing:'Não foi possível entrar.',network:'Serviço indisponível. Tente novamente.',register:'Criar conta',noAccount:'Não tem conta?'}
} as const;

export default function LoginPage() {
  const router = useRouter();
  const {language}=useAslanLanguage();
  const copy=labels[language];
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

      await response.json();

      if (!response.ok) {
        setError(copy.missing);
        return;
      }

      setPassword('');
      router.replace(next);
      router.refresh();
    } catch {
      setError(copy.network);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="section" style={{ minHeight: '75vh', display: 'grid', placeItems: 'center' }}>
      <form className="card" onSubmit={submit} style={{ width: 'min(430px, 100%)', display: 'grid', gap: 14 }}>
        <span className="kicker">ASLAN ACCOUNT</span>
        <h1>{copy.title}</h1>

        <input
          required
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder={copy.email}
          aria-label={copy.email}
          autoComplete="email"
        />

        <input
          required
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder={copy.password}
          aria-label={copy.password}
          autoComplete="current-password"
        />

        <button className="btn primary" type="submit" disabled={loading}>
          {loading ? copy.loading : copy.submit}
        </button>

        {error && <p style={{ color: '#ef8b8b' }}>{error}</p>}

        <p>
          {copy.noAccount} <Link href={'/register?next='+encodeURIComponent(returnTo)}>{copy.register}</Link>
        </p>
      </form>
    </main>
  );
}
