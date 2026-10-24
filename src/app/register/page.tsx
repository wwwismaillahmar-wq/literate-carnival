'use client';

import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import Link from 'next/link';
import { useAslanLanguage } from '@/components/AslanLocale';
const copyByLanguage={
 ar:{title:'إنشاء حساب',intro:'حساب واحد للوصول إلى خدمات ASLAN.',name:'الاسم الكامل',email:'البريد الإلكتروني',password:'كلمة السر',confirm:'تأكيد كلمة السر',rules:'باستخدام الحساب، التزم',rulesLink:'بقواعد الاحترام والخصوصية والمعاملات',loading:'جارٍ إنشاء الحساب...',submit:'إنشاء الحساب',hasAccount:'لديك حساب بالفعل؟',login:'تسجيل الدخول',short:'كلمة السر يجب أن تحتوي على 6 أحرف على الأقل.',mismatch:'كلمتا السر غير متطابقتين.',failed:'تعذر إنشاء الحساب.',network:'تعذر الاتصال بخدمة الحسابات. حاول مرة أخرى.',success:'تم إرسال طلب التسجيل.'},
 fr:{title:'Créer un compte',intro:'Un compte pour les services ASLAN.',name:'Nom complet',email:'E-mail',password:'Mot de passe',confirm:'Confirmer le mot de passe',rules:'En créant un compte, respectez',rulesLink:'les règles de confidentialité et de conduite',loading:'Création...',submit:'Créer un compte',hasAccount:'Déjà inscrit ?',login:'Connexion',short:'Au moins 6 caractères sont requis.',mismatch:'Les mots de passe ne correspondent pas.',failed:'Création impossible.',network:'Service indisponible. Réessayez.',success:'Demande envoyée.'},
 en:{title:'Create account',intro:'One account for ASLAN services.',name:'Full name',email:'Email address',password:'Password',confirm:'Confirm password',rules:'By creating an account, follow',rulesLink:'our conduct and privacy rules',loading:'Creating account...',submit:'Create account',hasAccount:'Already have an account?',login:'Sign in',short:'Password must contain at least 6 characters.',mismatch:'Passwords do not match.',failed:'Unable to create account.',network:'Account service unavailable. Try again.',success:'Registration submitted.'},
 es:{title:'Crear cuenta',intro:'Una cuenta para los servicios ASLAN.',name:'Nombre completo',email:'Correo electrónico',password:'Contraseña',confirm:'Confirmar contraseña',rules:'Al registrarte, respeta',rulesLink:'las normas de privacidad y conducta',loading:'Creando cuenta...',submit:'Crear cuenta',hasAccount:'¿Ya tienes cuenta?',login:'Iniciar sesión',short:'La contraseña debe tener al menos 6 caracteres.',mismatch:'Las contraseñas no coinciden.',failed:'No se pudo crear la cuenta.',network:'Servicio no disponible.',success:'Registro enviado.'},
 de:{title:'Konto erstellen',intro:'Ein Konto für ASLAN-Dienste.',name:'Vollständiger Name',email:'E-Mail-Adresse',password:'Passwort',confirm:'Passwort bestätigen',rules:'Mit der Anmeldung gelten',rulesLink:'unsere Datenschutz- und Verhaltensregeln',loading:'Konto wird erstellt...',submit:'Konto erstellen',hasAccount:'Schon registriert?',login:'Anmelden',short:'Mindestens 6 Zeichen erforderlich.',mismatch:'Passwörter stimmen nicht überein.',failed:'Konto konnte nicht erstellt werden.',network:'Dienst nicht erreichbar.',success:'Anmeldung gesendet.'},
 pt:{title:'Criar conta',intro:'Uma conta para os serviços ASLAN.',name:'Nome completo',email:'E-mail',password:'Senha',confirm:'Confirmar senha',rules:'Ao criar uma conta, siga',rulesLink:'as regras de privacidade e conduta',loading:'Criando conta...',submit:'Criar conta',hasAccount:'Já tem conta?',login:'Entrar',short:'A senha deve ter pelo menos 6 caracteres.',mismatch:'As senhas não coincidem.',failed:'Não foi possível criar a conta.',network:'Serviço indisponível.',success:'Cadastro enviado.'}
} as const;

export default function RegisterPage() {
  const {language}=useAslanLanguage();
  const copy=copyByLanguage[language];
  const [next, setNext] = useState('/');
  useEffect(() => { const value = new URLSearchParams(window.location.search).get('next'); if(value && value.startsWith('/') && !value.startsWith('//') && !value.includes(String.fromCharCode(92))) setNext(value); }, []);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');

    if (password.length < 6) {
      setError(copy.short);
      return;
    }

    if (password !== confirmPassword) {
      setError(copy.mismatch);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim(),
          password,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(copy.failed);
        return;
      }

      if (result.hasSession) {
        window.location.href = next;
        return;
      }

      setMessage(copy.success);
      setPassword('');
      setConfirmPassword('');
    } catch {
      setError(copy.network);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="section" style={{ minHeight: '75vh', display: 'grid', placeItems: 'center' }}>
      <form
        className="card"
        onSubmit={submit}
        style={{ width: 'min(430px, 100%)', display: 'grid', gap: 14 }}
      >
        <span className="kicker">ASLAN ACCOUNT</span>
        <h1>{copy.title}</h1>
        <p>{copy.intro}</p>

        <input
          required
          type="text"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          placeholder={copy.name} aria-label={copy.name}
          autoComplete="name"
        />

        <input
          required
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder={copy.email} aria-label={copy.email}
          autoComplete="email"
        />

        <input
          required
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder={copy.password} aria-label={copy.password}
          autoComplete="new-password"
          minLength={6}
        />

        <input
          required
          type="password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          placeholder={copy.confirm} aria-label={copy.confirm}
          autoComplete="new-password"
          minLength={6}
        />

        <p className="muted">{copy.rules} <Link href="/guides/rules">{copy.rulesLink}</Link>.</p>
        <button className="btn primary" type="submit" disabled={loading}>
          {loading ? copy.loading : copy.submit}
        </button>

        {message && <p>{message}</p>}
        {error && <p style={{ color: '#ef8b8b' }}>{error}</p>}

        <p>
          {copy.hasAccount} <Link href={'/login?next='+encodeURIComponent(next)}>{copy.login}</Link>
        </p>
      </form>
    </main>
  );
}
