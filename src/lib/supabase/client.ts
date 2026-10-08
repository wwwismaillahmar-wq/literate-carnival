import { createBrowserClient } from '@supabase/ssr';

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export function createClient() {
  const url = required('NEXT_PUBLIC_SUPABASE_URL');
  const key = required('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
  return createBrowserClient(url, key);
}
