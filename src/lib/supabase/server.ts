import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { serverConfig } from '@/lib/config.server';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(serverConfig.supabaseUrl, serverConfig.supabasePublishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {}
      },
    },
  });
}
