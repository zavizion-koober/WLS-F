import { inject, Injectable, PLATFORM_ID, signal, REQUEST } from '@angular/core';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { TranslateLoader, TranslateService, TranslationObject } from '@ngx-translate/core';
import { firstValueFrom, forkJoin, map, Observable, of } from 'rxjs';
import { Language } from 'src/generated/graphql';

export type Locale = 'en' | 'ka' | 'ru';

const STORAGE_KEY = 'locale';
const FALLBACK_LOCALE: Locale = 'en';

export const LANGUAGE_BY_LOCALE: Record<Locale, Language> = {
  en: Language.En,
  ka: Language.Ka,
  ru: Language.Ru,
};

@Injectable({ providedIn: 'root' })
export class LocaleService {
  private readonly translate = inject(TranslateService);
  private readonly loader = inject(TranslateLoader);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly document = inject(DOCUMENT);
  private readonly request = inject(REQUEST, { optional: true });

  public readonly active = signal<Locale>(FALLBACK_LOCALE);
  public readonly supported: Locale[] = ['en', 'ka', 'ru'];

  private readonly loaded = new Set<Locale>();
  private readonly initialLang = this.resolveInitialLang();

  constructor() {
    this.translate.addLangs(this.supported);
    this.active.set(this.initialLang);
  }

  public async bootstrap(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) {
      this.activate(this.initialLang);
      return;
    }

    const langs: Locale[] =
      this.initialLang === FALLBACK_LOCALE
        ? [FALLBACK_LOCALE]
        : [FALLBACK_LOCALE, this.initialLang];

    try {
      await firstValueFrom(forkJoin(langs.map((lang) => this.loadLocale(lang))));
    } catch {
      // Fallback
    }
    this.activate(this.initialLang);
  }

  public setLocale(locale: Locale): void {
    if (!this.supported.includes(locale) || this.active() === locale) {
      return;
    }

    this.active.set(locale);

    if (this.loaded.has(locale)) {
      this.activate(locale);
    } else {
      this.loadLocale(locale).subscribe(() => this.activate(locale));
    }
  }

  public getGraphQLLanguage(): Language {
    return LANGUAGE_BY_LOCALE[this.active()] || Language.En;
  }

  private resolveInitialLang(): Locale {
    if (!isPlatformBrowser(this.platformId)) {
      if (this.request) {
        let cookieHeader = '';
        const reqAny = this.request as any;
        if (reqAny.headers) {
          if (typeof reqAny.headers.get === 'function') {
            cookieHeader = reqAny.headers.get('cookie') || '';
          } else if (reqAny.headers.cookie) {
            cookieHeader = reqAny.headers.cookie || '';
          } else if (reqAny.headers['cookie']) {
            cookieHeader = reqAny.headers['cookie'] || '';
          }
        }
        const match = cookieHeader.match(
          new RegExp('(^|;)\\s*' + STORAGE_KEY + '\\s*=\\s*([^;]+)'),
        );
        if (match) {
          const value = match[2] as Locale;
          if (this.supported.includes(value)) {
            return value;
          }
        }
      }
      return FALLBACK_LOCALE;
    }
    const saved = localStorage.getItem(STORAGE_KEY) as Locale | null;
    return saved && this.supported.includes(saved) ? saved : FALLBACK_LOCALE;
  }

  private activate(lang: Locale): void {
    if (this.translate.getFallbackLang() !== FALLBACK_LOCALE) {
      this.translate.setFallbackLang(FALLBACK_LOCALE);
    }
    this.translate.use(lang);
    this.document.documentElement.lang = lang;

    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(STORAGE_KEY, lang);
      this.document.cookie = `${STORAGE_KEY}=${lang};path=/;max-age=31536000;SameSite=Lax`;
    }
  }

  private loadLocale(lang: Locale): Observable<void> {
    if (this.loaded.has(lang)) {
      return of(undefined);
    }

    return this.loader.getTranslation(lang).pipe(
      map((translations: TranslationObject) => {
        this.translate.setTranslation(lang, translations, false);
        this.loaded.add(lang);
      }),
    );
  }
}
