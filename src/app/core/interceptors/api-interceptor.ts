import { env } from '@environments/environment';
import { HttpInterceptorFn } from '@angular/common/http';
import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

import { SKIP_AUTH } from '@core/http/skip-auth.token';

export const apiInterceptor: HttpInterceptorFn = (req, next) => {
  const platformId = inject(PLATFORM_ID);
  const isBrowser = isPlatformBrowser(platformId);

  if (req.url.startsWith('icons/') || req.url.includes('/i18n/')) {
    return next(req);
  }

  const skipAuth = req.context.get(SKIP_AUTH);
  const accessToken = isBrowser ? localStorage.getItem(env.TOKEN.ACCESS_TOKEN) : null;
  const lang = isBrowser ? (localStorage.getItem('locale') ?? 'en') : 'en';

  const isAbsoluteUrl = req.url.startsWith('http://') || req.url.startsWith('https://');
  const baseUrl = !isBrowser ? (env.SERVER_API_FALLBACK_BASE || 'http://localhost:5210') : '';

  if (req.url.includes('graphql')) {
    const headers: Record<string, string> = {
      'Accept-Language': lang,
      'X-Requested-With': 'XMLHttpRequest',
    };

    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    const graphqlReq = req.clone({
      url: isAbsoluteUrl ? req.url : `${baseUrl}${req.url.startsWith('/') ? '' : '/'}${req.url}`,
      setHeaders: headers,
      withCredentials: isBrowser,
    });

    return next(graphqlReq);
  }

  const headers: Record<string, string> = {
    'Accept-Language': lang,
    'X-Requested-With': 'XMLHttpRequest',
  };

  if (!skipAuth && accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const normalizedUrl = req.url.startsWith('/') ? req.url : `/${req.url}`;
  const apiReq = req.clone({
    url: isAbsoluteUrl ? req.url : `${baseUrl}${normalizedUrl}`,
    setHeaders: headers,
    withCredentials: isBrowser,
  });

  return next(apiReq);
};
