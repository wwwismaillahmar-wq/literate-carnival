import { ASLAN_LOCALES, DEFAULT_LOCALE, type AslanLocale } from './core';
export type LocalizedText = Partial<Record<AslanLocale, string>>;
export function localizedText(values: LocalizedText | null | undefined, locale: AslanLocale, fallback = ''): string {
 return values?.[locale]?.trim() || values?.[DEFAULT_LOCALE]?.trim() || fallback;
}
export function normalizeSearchText(value: string): string {
 return value.normalize('NFKC').toLocaleLowerCase().trim();
}
export function localeFromPathname(pathname: string): AslanLocale {
 const first = pathname.split('/').filter(Boolean)[0];
 return ASLAN_LOCALES.includes(first as AslanLocale) ? first as AslanLocale : DEFAULT_LOCALE;
}
