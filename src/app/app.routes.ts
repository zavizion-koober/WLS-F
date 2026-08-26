import { Routes } from '@angular/router';

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
    ],
  },
  {
    path: '**',
    redirectTo: '',
    pathMatch: 'full',
  },
];
