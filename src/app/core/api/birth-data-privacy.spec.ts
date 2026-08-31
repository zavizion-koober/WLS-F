import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { RenderMode } from '@angular/ssr';
import { beforeEach, describe, expect, it } from 'vitest';

import { serverRoutes } from '@app/app.routes.server';
import { routes } from '@app/app.routes';
import { API_URLS } from '@core/http/api-urls.token';
import type { BirthInput } from '@core/models/gemstones.models';

import { GemstonesApiService } from './gemstones-api.service';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');

const BIRTH: BirthInput = {
  localDate: '1990-05-14',
  localTime: '07:20:00',
  latitude: 41.7151,
  longitude: 44.8271,
  elevation: 0,
  timeZoneId: 'Asia/Tbilisi',
  utcOffsetHours: null,
};

/**
 * Two rules, both absolute, both checked here rather than trusted to review.
 *
 *   1. Birth data never enters a URL.
 *   2. Birth data never transits the SSR node server.
 *
 * Date plus exact time plus place is close to a unique identifier for a living
 * person. A URL lands in browser history, in a referrer header, in an access
 * log, in a screenshot and in a pasted link — and the backend's own rule is that
 * this data is never logged. Both rules protect the same thing from two
 * directions, and both are the kind of property that decays silently: someone
 * adds a query parameter "just for a debug link", someone flips a route to
 * server rendering for a link preview, and nothing fails.
 */
describe('birth data privacy', () => {
  describe('never in a url', () => {
    let gemstones: GemstonesApiService;
    let http: HttpTestingController;

    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [
          provideHttpClient(),
          provideHttpClientTesting(),
          { provide: API_URLS, useValue: { rest: '/api/v1' } },
        ],
      });
      gemstones = TestBed.inject(GemstonesApiService);
      http = TestBed.inject(HttpTestingController);
    });

    it('puts no part of the birth input in the request url or query string', () => {
      gemstones.createSession({ birthInput: BIRTH }).subscribe();

      const req = http.expectOne('/api/v1/gemstones/sessions');
      const url = req.request.urlWithParams;

      for (const value of [
        BIRTH.localDate,
        BIRTH.localTime!,
        String(BIRTH.latitude),
        String(BIRTH.longitude),
        BIRTH.timeZoneId!,
        '1990',
        '41.7',
      ]) {
        expect(url).not.toContain(value);
      }

      expect(url).toBe('/api/v1/gemstones/sessions');
      expect(req.request.body).toEqual({ birthInput: BIRTH });
      req.flush({});
    });

    it('declares no route parameter or query that could carry birth data', () => {
      const paths = collectPaths(routes);

      // The reading routes take an opaque publicId and an opaque shareToken.
      // Anything named for a date, a time or a place would be the leak.
      const suspicious = paths.filter((p) =>
        /(:.*)?(birth|date|time|lat|lon|lng|place|tz|zone|coord)/i.test(p),
      );
      expect(suspicious).toEqual([]);
    });

    it('routes the reading on publicId only', () => {
      const paths = collectPaths(routes);
      expect(paths).toContain('reading/:publicId');
      expect(paths).toContain('shared/:shareToken');
      // `reading` itself is bare: the form posts, it does not navigate with data.
      expect(paths).toContain('reading');
    });
  });

  describe('never through the ssr node server', () => {
    it('client-renders every route that holds birth data', () => {
      const mode = (path: string) => serverRoutes.find((r) => r.path === path)?.renderMode;

      // The form collects it.
      expect(mode('reading')).toBe(RenderMode.Client);
      // The owner response contains it.
      expect(mode('reading/:publicId')).toBe(RenderMode.Client);
    });

    it('server-renders the shared route, which is the allow-list projection', () => {
      // Safe to render on our server precisely because SharedSessionResponse has
      // no birth input, no chart facts, no data tier and no unavailability list
      // — they are never built, not filtered.
      const shared = serverRoutes.find((r) => r.path === 'shared/:shareToken');
      expect(shared?.renderMode).toBe(RenderMode.Server);
    });

    it('gives the node server no /api proxy to carry a birth-data post through', () => {
      // Comments are stripped first — this file documents the rule at length,
      // and matching its own prose would make the test pass on the explanation
      // rather than on the code.
      const server = stripComments(readFileSync(join(repoRoot, 'src', 'server.ts'), 'utf8'));

      // A proxy here would make this process the path of least resistance for
      // the one request that must go browser → API directly.
      expect(server).not.toMatch(/['"`]\/api/);
      expect(server).not.toMatch(/createProxyMiddleware|http-proxy|app\.use\(\s*['"`]\/api/);
    });
  });

  /**
   * WLS-F registers three interceptors app-wide on `provideHttpClient`, and all
   * three are wrong for this client:
   *
   *   `apiInterceptor`     rewrites a relative url to SERVER_API_FALLBACK_BASE on
   *                        the server pass — which is birth data transiting the
   *                        SSR node server, the thing the rule above forbids.
   *   `refreshInterceptor` treats a 401 as an expired shop session and can
   *                        dispatch Logout. A reading is anonymous; a 404 here
   *                        must not sign someone out of the shop.
   *   `errorInterceptor`   raises a generic DATA_LOAD_FAILED toast on any failed
   *                        GET. BEAD_CATALOG_EMPTY is explicitly not a fault.
   *
   * So this client builds its own HttpClient over HttpBackend and is wrapped by
   * none of them. Asserted on the source because the alternative — booting the
   * real interceptor chain — would need the NGXS store, the notification service
   * and a token in localStorage to prove one line.
   */
  describe('bypasses the app-wide interceptors', () => {
    it('builds its own HttpClient over HttpBackend', () => {
      const source = readFileSync(
        join(repoRoot, 'src', 'app', 'core', 'api', 'api-client.base.ts'),
        'utf8',
      );
      const code = stripComments(source);

      expect(code).toMatch(/HttpBackend/);
      expect(code).toMatch(/new HttpClient\(/);
      expect(code).not.toMatch(/inject\(HttpClient\)/);
    });
  });
});

function collectPaths(
  config: readonly { path?: string; children?: readonly any[] }[],
  prefix = '',
): string[] {
  return config.flatMap((route) => {
    const path = [prefix, route.path ?? ''].filter(Boolean).join('/');
    return [path, ...(route.children ? collectPaths(route.children, path) : [])];
  });
}

function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '');
}
