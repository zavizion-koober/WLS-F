import { Language } from 'src/generated/graphql';
import { Locale, LANGUAGE_BY_LOCALE } from '@core/services/locale.service';

export function getLocalizedTranslation<T extends { language?: string | Language | null }>(
  translations: readonly T[] | T[] | null | undefined,
  locale: Locale,
): T | null {
  if (!translations || translations.length === 0) return null;
  const targetLang = LANGUAGE_BY_LOCALE[locale] || Language.En;
  return (
    translations.find((t) => t.language === targetLang) ||
    translations.find((t) => t.language === Language.En) ||
    translations[0] ||
    null
  );
}

export function getLocalizedName<T extends { language?: string | Language | null; name?: string | null }>(
  translations: readonly T[] | T[] | null | undefined,
  locale: Locale,
  fallback = '',
): string {
  const t = getLocalizedTranslation(translations, locale);
  return t?.name || fallback;
}

export function getLocalizedDescription<
  T extends {
    language?: string | Language | null;
    description?: string | null;
    shortDescription?: string | null;
    longDescription?: string | null;
  },
>(translations: readonly T[] | T[] | null | undefined, locale: Locale, fallback = ''): string {
  const t = getLocalizedTranslation(translations, locale);
  if (!t) return fallback;
  return t.description || t.shortDescription || t.longDescription || fallback;
}
