import { HttpErrorResponse, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { TranslateService } from '@ngx-translate/core';
import { catchError, tap, throwError } from 'rxjs';
import { NotificationService } from '@core/services/notification.service';

interface IError {
  message: string;
  code?: string;
  title: string;
}

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const platformId = inject(PLATFORM_ID);
  const isBrowser = isPlatformBrowser(platformId);
  const notification = inject(NotificationService);
  const translate = inject(TranslateService);

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      if (!isBrowser || req.url.includes('/auth/refresh')) {
        return throwError(() => err);
      }

      if (req.method.toUpperCase() === 'GET') {
        if (!req.url.includes('graphql')) {
          notification.error(
            translate.instant('MESSAGES.ERRORS.DATA_LOAD_FAILED'),
            translate.instant('MESSAGES.TITLES.ERROR'),
          );
        }
        return throwError(() => err);
      }

      const error = err.error;
      const messages: IError[] = [];

      if (error?.errors && typeof error.errors === 'object') {
        Object.values(error.errors).forEach((errorArray: unknown) => {
          if (Array.isArray(errorArray)) {
            errorArray.forEach((msg: string) => {
              messages.push({ message: msg, title: error.title });
            });
          }
        });
      }

      if (error?.error && typeof error.error === 'object') {
        messages.push({
          message: error.error.message,
          title: error.error.title,
          code: error.error.code,
        });
      }

      if (messages.length === 0 && typeof error?.detail === 'string') {
        messages.push({
          message: error.detail,
          title: error.title ?? translate.instant('MESSAGES.TITLES.ERROR'),
        });
      }

      if (messages.length === 0 && typeof error?.message === 'string') {
        messages.push({
          message: error.message,
          title: error.title ?? translate.instant('MESSAGES.TITLES.ERROR'),
        });
      }

      if (messages.length === 0 && typeof error === 'string') {
        messages.push({
          message: error,
          title: translate.instant('MESSAGES.TITLES.ERROR'),
        });
      }

      if (messages.length === 0) {
        messages.push({
          message: translate.instant('MESSAGES.ERRORS.DATA_LOAD_FAILED'),
          title: translate.instant('MESSAGES.TITLES.ERROR'),
        });
      }

      messages.forEach((e) =>
        notification.error(
          e.message ? translate.instant(e.message) : translate.instant('MESSAGES.ERRORS.DATA_LOAD_FAILED'),
          e.code ? getErrorTitle(e.code, translate) : translate.instant(e.title ?? 'MESSAGES.TITLES.ERROR'),
        ),
      );

      return throwError(() => err);
    }),
    tap((event) => {
      if (!isBrowser) return;

      if (event instanceof HttpResponse && req.url.includes('graphql')) {
        const body = event.body as {
          errors?: Array<{ message?: string; extensions?: { code?: string } }>;
        };
        if (body?.errors && Array.isArray(body.errors)) {
          body.errors.forEach((err) => {
            const isAuth =
              err.extensions?.code &&
              ['UNAUTHENTICATED', 'AUTH_NOT_AUTHENTICATED'].includes(err.extensions.code);
            if (!isAuth) {
              notification.error(
                err.message
                  ? translate.instant(err.message)
                  : translate.instant('MESSAGES.ERRORS.DATA_LOAD_FAILED'),
                err.extensions?.code
                  ? getErrorTitle(err.extensions.code, translate)
                  : translate.instant('MESSAGES.TITLES.ERROR'),
              );
            }
          });
        }
      }
    }),
  );
};

const getErrorTitle = (code: string, translate: TranslateService): string => {
  if (code.includes('Auth.')) return translate.instant('MESSAGES.TITLES.AUTH_ERROR');
  return translate.instant('MESSAGES.TITLES.UNKNOWN_ERROR');
};
