import { Routes } from '@angular/router';
import { authGuard } from '@core/guards/auth.guard';

const cartRoutes: Routes = [
  {
    path: 'cart',
    loadComponent: () =>
      import('@features/cart/cart-page.component').then((m) => m.CartPageComponent),
  },
  {
    path: 'checkout',
    canActivate: [authGuard],
    loadComponent: () =>
      import('@features/checkout/checkout.component').then((m) => m.CheckoutComponent),
  },
  {
    path: 'order-success',
    loadComponent: () =>
      import('@features/checkout/order-success.component').then(
        (m) => m.OrderSuccessComponent,
      ),
  },
];

export default cartRoutes;
