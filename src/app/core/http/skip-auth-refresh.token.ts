import { HttpContext, HttpContextToken } from '@angular/common/http';

export const SKIP_AUTH_REFRESH = new HttpContextToken<boolean>(() => false);

export const skipAuthRefreshContext = (): HttpContext =>
  new HttpContext().set(SKIP_AUTH_REFRESH, true);
