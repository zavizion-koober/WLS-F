import { Routes } from '@angular/router';
import { authGuard } from '@core/guards/auth.guard';

const accountRoutes: Routes = [
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('@features/account/account-layout.component').then(
        (m) => m.AccountLayoutComponent,
      ),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('@features/account/overview/account-overview.component').then(
            (m) => m.AccountOverviewComponent,
          ),
      },
      {
        path: 'orders',
        loadComponent: () =>
          import('@features/account/orders/account-orders.component').then(
            (m) => m.AccountOrdersComponent,
          ),
      },
      {
        path: 'addresses',
        loadComponent: () =>
          import('@features/account/addresses/account-addresses.component').then(
            (m) => m.AccountAddressesComponent,
          ),
      },
      {
        path: 'details',
        loadComponent: () =>
          import('@features/account/details/account-details.component').then(
            (m) => m.AccountDetailsComponent,
          ),
      },
      {
        path: 'security',
        loadComponent: () =>
          import('@features/account/security/account-security.component').then(
            (m) => m.AccountSecurityComponent,
          ),
      },
    ],
  },
];

export default accountRoutes;
