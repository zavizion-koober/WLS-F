import { HttpClient } from '@angular/common/http';
import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { TranslateLoader, TranslateModuleConfig, TranslationObject } from '@ngx-translate/core';
import { forkJoin, map, Observable, of } from 'rxjs';

const TRANSLATION_FOLDERS = ['content'];

declare const __non_webpack_require__: any;

export class HttpTranslateLoader implements TranslateLoader {
  constructor(
    private http: HttpClient,
    private isBrowser: boolean,
  ) {}

  getTranslation(lang: string): Observable<TranslationObject> {
    if (!this.isBrowser) {
      try {
        const req =
          typeof __non_webpack_require__ !== 'undefined'
            ? __non_webpack_require__
            : (globalThis as any).require;

        if (req) {
          const fs = req('fs');
          const path = req('path');
          const filePath = path.resolve(process.cwd(), `public/i18n/content/${lang}.json`);
          if (fs.existsSync(filePath)) {
            const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            return of(data);
          }
        }
      } catch {
        // Fallback
      }
      return of({});
    }

    const requests = TRANSLATION_FOLDERS.map((folder) =>
      this.http.get<TranslationObject>(`/i18n/${folder}/${lang}.json`),
    );

    return forkJoin(requests).pipe(map((results) => Object.assign({}, ...results)));
  }
}

export function createTranslateLoader(http: HttpClient): TranslateLoader {
  const platformId = inject(PLATFORM_ID);
  return new HttpTranslateLoader(http, isPlatformBrowser(platformId));
}

/**
 * `fallbackLang` is what makes `ka` and `ru` render English rather than raw key
 * paths. It matters for the StoneCraft copy specifically: `STONECRAFT` lives in
 * `en.json` only, because its Georgian and Russian bundles need a fluent author
 * rather than a translation pass. Without a fallback those two languages would
 * show `STONECRAFT.READING.TITLE` on the page.
 */
export const translateConfig: TranslateModuleConfig = {
  loader: {
    provide: TranslateLoader,
    useFactory: createTranslateLoader,
    deps: [HttpClient],
  },
  fallbackLang: 'en',
};
