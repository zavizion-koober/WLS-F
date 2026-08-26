import { HttpBackend, HttpClient, HttpParams } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, map, type Observable, of, startWith } from 'rxjs';

import { API_URLS } from '@core/http/api-urls.token';

import { toApiFailure } from './api-failure';
import { failed, loading, success, type RequestState } from './request-state';

/**
 * Shared plumbing for the typed REST clients.
 *
 * REST via `HttpClient` is a deliberate divergence from WLS-F, which is Apollo
 * against a GraphQL shop schema. StoneCraft-B is REST; wrapping it in GraphQL to
 * make the two projects look alike would add a translation layer in service of a
 * cosmetic similarity. On merge the app carries both clients, which is normal.
 *
 * Every method returns `Observable<RequestState<T>>` — the request's whole life,
 * not just its happy ending. `startWith(loading())` means a subscriber sees the
 * loading state without the caller having to set it, and `catchError` guarantees
 * the stream completes with an `error` state rather than erroring out, so a
 * template bound to it never dies.
 */
export abstract class ApiClientBase {
  /**
   * Its own client, over the raw backend, wrapped by no interceptor.
   *
   * WLS-F registers `apiInterceptor`, `refreshInterceptor` and
   * `errorInterceptor` app-wide on `provideHttpClient`, and each one breaks
   * something here:
   *
   * - `apiInterceptor` rewrites a relative url to `SERVER_API_FALLBACK_BASE` on
   *   the server-side pass. That is birth data transiting the SSR node server,
   *   which is the one thing this whole design forbids.
   * - `refreshInterceptor` reads a 401 as an expired shop session and can
   *   dispatch `Logout`. A reading is anonymous, and its 404 is deliberately
   *   ambiguous between not-found, not-yours and expired — none of which means
   *   the person's shop session ended.
   * - `errorInterceptor` fires a generic `DATA_LOAD_FAILED` toast on any failed
   *   GET, on top of the specific message this client already produces.
   *   `BEAD_CATALOG_EMPTY` is explicitly not a fault, and toasting an error over
   *   it would be wrong twice.
   *
   * `HttpBackend` is the un-intercepted transport, so this is one line rather
   * than three opt-out context tokens that a fourth interceptor would escape.
   *
   * Nothing is lost by skipping them: this API is not authenticated, and it
   * localises through reason keys resolved client-side rather than through an
   * `Accept-Language` header.
   */
  protected readonly http = new HttpClient(inject(HttpBackend));
  protected readonly baseUrl = inject(API_URLS).rest;

  protected get<T>(path: string, params?: HttpParams): Observable<RequestState<T>> {
    return this.track(this.http.get<T>(`${this.baseUrl}${path}`, { params }));
  }

  protected post<T>(path: string, body: unknown): Observable<RequestState<T>> {
    return this.track(this.http.post<T>(`${this.baseUrl}${path}`, body));
  }

  protected put<T>(path: string, body: unknown, params?: HttpParams): Observable<RequestState<T>> {
    return this.track(this.http.put<T>(`${this.baseUrl}${path}`, body, { params }));
  }

  private track<T>(request: Observable<T>): Observable<RequestState<T>> {
    return request.pipe(
      map((value) => success(value)),
      catchError((error: unknown) => of(failed<T>(toApiFailure(error)))),
      startWith(loading() as RequestState<T>),
    );
  }

  /**
   * Builds query params, dropping anything undefined.
   *
   * `false` and `0` are kept: `isActive=false` and `page=0` are real values, and
   * a truthiness check would silently discard both.
   */
  protected toParams(
    query: Readonly<Record<string, string | number | boolean | undefined>>,
  ): HttpParams {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) {
        params = params.set(key, String(value));
      }
    }
    return params;
  }
}
