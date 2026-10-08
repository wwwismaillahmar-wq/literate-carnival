import { createBrowserClient } from '@supabase/ssr';

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export function createClient() {
  const url = required('NEXT_PUBLIC_SUPABASE_URL');
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!key) {
    throw new Error(
      'Missing required environment variable: NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'
    );
  }

  return createBrowserClient(url, key);
}
