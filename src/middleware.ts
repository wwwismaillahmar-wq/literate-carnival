import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { ASLAN_LOCALES, DEFAULT_LOCALE, resolveLocale } from './lib/i18n/core';

export async function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const segments = url.pathname.split('/').filter(Boolean);
  const prefix = segments[0];
  const hasLocale = ASLAN_LOCALES.some(code => code === prefix);
  const locale = hasLocale ? resolveLocale(prefix) : resolveLocale(request.cookies.get('aslan-language')?.value || request.headers.get('accept-language')?.split(',')[0]?.split('-')[0] || DEFAULT_LOCALE);
  const canonicalPath = hasLocale ? '/' + segments.slice(1).join('/') : url.pathname;
  const normalizedPath = canonicalPath || '/';
  // Preserve Next.js trailingSlash routing in the rewrite destination; rewriting
  // /en/partners/ to /partners (without the final slash) resolves to 404 in App Router.
  if (hasLocale) url.pathname = normalizedPath === '/' ? '/' : normalizedPath + '/';
  request.cookies.set('aslan-language', locale);
  // Locale routing is handled by Next.js beforeFiles rewrites; middleware only manages cookies/auth.
  let response = NextResponse.next({ request });
  response.cookies.set('aslan-language', locale, { path: '/', sameSite: 'lax', maxAge: 31536000, secure: request.nextUrl.protocol === 'https:' });
  const pathname = normalizedPath;
  const isAdminLogin = pathname === '/admin/login';
  const isAdminArea = pathname === '/admin' || pathname.startsWith('/admin/');
  // Public pages must not block on a remote authentication lookup.
  if (!isAdminArea || isAdminLogin) return response;
  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = hasLocale ? '/' + locale + '/admin/login' : '/admin/login';
  loginUrl.searchParams.set('next', pathname);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) return NextResponse.redirect(loginUrl);

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        response.cookies.set('aslan-language', locale, { path: '/', sameSite: 'lax', maxAge: 31536000, secure: request.nextUrl.protocol === 'https:' });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });

  const { data } = await supabase.auth.getClaims().catch(() => ({ data: null }));
  const user = data?.claims;
  if (!user) return NextResponse.redirect(loginUrl);
  return response;
}

export const config = { matcher: ['/((?!api/|_next/|.*\\..*).*)'] };
