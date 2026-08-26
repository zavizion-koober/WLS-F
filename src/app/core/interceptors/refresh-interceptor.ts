import {
  HttpErrorResponse,
  HttpEvent,
  HttpInterceptorFn,
  HttpRequest,
  HttpResponse,
} from '@angular/common/http';
import { catchError, Observable, of, Subject, switchMap, take, throwError } from 'rxjs';
import { inject, PLATFORM_ID } from '@angular/core';

import { SKIP_AUTH_REFRESH } from '@core/http/skip-auth-refresh.token';
import { AuthService } from '@store/auth/auth.service';
import { Logout } from '@store/auth/auth.actions';
import { Store } from '@ngxs/store';
import { env } from '@environments/environment';
import { isPlatformBrowser } from '@angular/common';

type RefreshOutcome = { ok: true; token: string } | { ok: false };

let isRefreshing = false;
const refreshOutcome$ = new Subject<RefreshOutcome>();

export const refreshInterceptor: HttpInterceptorFn = (req, next) => {
  const isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  if (!isBrowser || req.context.get(SKIP_AUTH_REFRESH)) {
    return next(req);
  }

  const auth = inject(AuthService);
  const store = inject(Store);

  const refreshAndRetry = (): Observable<HttpEvent<unknown>> => {
    if (isRefreshing) {
      return refreshOutcome$.pipe(
        take(1),
        switchMap((outcome) =>
          outcome.ok
            ? next(withAuthHeader(req, outcome.token))
            : throwError(() => new HttpErrorResponse({ status: 401, url: req.url })),
        ),
      );
    }

    isRefreshing = true;

    return auth.refresh().pipe(
      switchMap((res) => {
        if (isBrowser) {
          localStorage.setItem(env.TOKEN.ACCESS_TOKEN, res.accessToken);
        }
        isRefreshing = false;
        refreshOutcome$.next({ ok: true, token: res.accessToken });

        const retriedReq = withAuthHeader(req, res.accessToken).clone({
          context: req.context.set(SKIP_AUTH_REFRESH, true),
        });

        return next(retriedReq);
      }),
      catchError((refreshErr) => {
        isRefreshing = false;
        refreshOutcome$.next({ ok: false });
        store.dispatch(new Logout());
        return throwError(() => refreshErr);
      }),
    );
  };

  return next(req).pipe(
    switchMap((event) => (isGraphqlAuthFailure(req, event) ? refreshAndRetry() : of(event))),
    catchError((err: HttpErrorResponse) =>
      err.status === 401 ? refreshAndRetry() : throwError(() => err),
    ),
  );
};

const withAuthHeader = (req: HttpRequest<unknown>, token: string): HttpRequest<unknown> =>
  req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });

interface GraphqlError {
  message?: string;
  extensions?: { code?: string };
}

interface GraphqlResponseBody {
  errors?: GraphqlError[];
}

const isGraphqlAuthFailure = (req: HttpRequest<unknown>, event: HttpEvent<unknown>): boolean => {
  if (!(event instanceof HttpResponse) || !req.url.includes('graphql')) return false;
  const errors = (event.body as GraphqlResponseBody | null)?.errors;
  return Array.isArray(errors) && errors.some(isAuthError);
};

const AUTH_ERROR_CODES = new Set(['UNAUTHENTICATED', 'AUTH_NOT_AUTHENTICATED']);
const AUTH_ERROR_MESSAGE_HINTS = ['Unauthenticated', 'Unauthorized'];

const isAuthError = (err: GraphqlError): boolean => {
  const code = err.extensions?.code;
  if (code && AUTH_ERROR_CODES.has(code)) return true;
  const message = err.message ?? '';
  return AUTH_ERROR_MESSAGE_HINTS.some((hint) => message.includes(hint));
};
