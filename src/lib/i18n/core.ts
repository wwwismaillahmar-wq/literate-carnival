/** Shared locale contract for ASLAN. ICU MessageFormat is the target message syntax. */
export const ASLAN_LOCALES = ['ar','fr','en','es','de','pt'] as const;
export type AslanLocale = typeof ASLAN_LOCALES[number];
export const DEFAULT_LOCALE: AslanLocale = 'ar';
export const LOCALE_STORAGE_KEY = 'aslan-language';
export const LOCALE_EVENT = 'aslan:language-change';
export const localeDirection = (locale: AslanLocale) => locale === 'ar' ? 'rtl' : 'ltr';
export function resolveLocale(input: unknown): AslanLocale {
  return typeof input === 'string' && (ASLAN_LOCALES as readonly string[]).includes(input)
    ? input as AslanLocale : DEFAULT_LOCALE;
}
export function applyLocale(locale: AslanLocale): void {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = locale;
  document.documentElement.dir = localeDirection(locale);
}
export function persistLocale(locale: AslanLocale): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  document.cookie = `${LOCALE_STORAGE_KEY}=${locale}; Path=/; Max-Age=31536000; SameSite=Lax`;
  applyLocale(locale);
  window.dispatchEvent(new Event(LOCALE_EVENT));
}
export type LocaleDictionary = Partial<Record<AslanLocale, Record<string,string>>>;
/** Missing translations are surfaced in development/test instead of silently passing. */
export function translate(dictionary: LocaleDictionary, locale: AslanLocale, key: string): string {
  const value = dictionary[locale]?.[key];
  if (value?.trim()) return value;
  if (process.env.NODE_ENV !== 'production') {
    console.warn('[ASLAN i18n] Missing translation', locale, key);
  }
  return dictionary[DEFAULT_LOCALE]?.[key] || key;
}

/** Culture-aware presentation without mutating stored business values. */
export function formatAslanNumber(value: number, locale: AslanLocale, options?: Intl.NumberFormatOptions): string { return new Intl.NumberFormat(locale, options).format(value); }
export function formatAslanDate(value: Date | string | number, locale: AslanLocale, options?: Intl.DateTimeFormatOptions): string { return new Intl.DateTimeFormat(locale, options).format(new Date(value)); }
export function formatAslanPrice(value: number, locale: AslanLocale, currency = 'DZD'): string { return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(value); }
