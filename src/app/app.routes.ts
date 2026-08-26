import { Routes } from '@angular/router';

import { stonecraftRoutes } from '@features/stonecraft.routes';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('@layout/root-layout/root-layout.component').then((m) => m.RootLayoutComponent),
    children: [
      {
        path: '',
        loadChildren: () => import('@features/root/root.routes'),
      },
      {
        path: '',
        loadChildren: () => import('@features/cart/cart.routes'),
      },
      {
        path: '',
        loadChildren: () => import('@features/auth/auth.routes'),
      },
      {
        path: 'account',
        loadChildren: () => import('@features/account/account.routes'),
      },

      // The reading and the bracelet designer. Inside the root layout so a
      // reading is not a dead end — the header, footer and cart stay reachable.
      // Spread from a static array rather than lazy-loaded because the privacy
      // specs walk this table; see stonecraft.routes.ts.
      ...stonecraftRoutes,
    ],
  },
  {
    path: '**',
    redirectTo: '',
    pathMatch: 'full',
  },
];
