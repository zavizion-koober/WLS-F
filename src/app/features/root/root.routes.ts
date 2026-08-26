import { Routes } from '@angular/router';

const rootRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('@features/home/home.component').then((m) => m.HomeComponent),
  },
  {
    path: 'shop',
    loadComponent: () =>
      import('@features/shop/shop.component').then((m) => m.ShopComponent),
  },
  {
    path: 'product/:slug',
    loadComponent: () =>
      import('@features/product/product-detail.component').then(
        (m) => m.ProductDetailComponent,
      ),
  },
  {
    path: 'search',
    loadComponent: () =>
      import('@features/search/search.component').then((m) => m.SearchComponent),
  },
  {
    path: 'about',
    loadComponent: () =>
      import('@features/about/about.component').then((m) => m.AboutComponent),
  },
  {
    path: 'faq',
    loadComponent: () =>
      import('@features/faq/faq.component').then((m) => m.FaqComponent),
  },
  {
    path: 'contact',
    loadComponent: () =>
      import('@features/contact/contact.component').then((m) => m.ContactComponent),
  },
];

export default rootRoutes;
