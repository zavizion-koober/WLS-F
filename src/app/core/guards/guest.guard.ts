import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { CanActivateFn, Router } from '@angular/router';
import { Store } from '@ngxs/store';
import { AuthSelectors } from '@store/auth/auth.selectors';
import { AppInitService } from '@core/services/app-init.service';
import { map, take } from 'rxjs';

export const guestGuard: CanActivateFn = () => {
  const platformId = inject(PLATFORM_ID);
  if (isPlatformServer(platformId)) {
    return true;
  }

  const store = inject(Store);
  const router = inject(Router);
  const appInit = inject(AppInitService);

  return appInit.ready$.pipe(
    take(1),
    map(() => {
      if (store.selectSnapshot(AuthSelectors.isAuthenticated)) {
        return router.createUrlTree(['/']);
      }
      return true;
    }),
  );
};
