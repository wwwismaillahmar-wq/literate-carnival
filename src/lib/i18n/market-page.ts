import { cookies } from 'next/headers';
import { resolveLocale } from '@/lib/i18n/core';

export async function getMarketLocale() {
  return resolveLocale((await cookies()).get('aslan-language')?.value);
}
