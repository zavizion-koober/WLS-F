import {
  ApplicationConfig,
  importProvidersFrom,
  inject,
  PLATFORM_ID,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { isPlatformBrowser, registerLocaleData } from '@angular/common';
import en from '@angular/common/locales/en';
import ka from '@angular/common/locales/ka';
import ru from '@angular/common/locales/ru';
import { TranslateModule } from '@ngx-translate/core';
import { provideStore } from '@ngxs/store';
import { withNgxsReduxDevtoolsPlugin } from '@ngxs/devtools-plugin';
import {
  GoogleLoginProvider,
  SOCIAL_AUTH_CONFIG,
  SocialLoginModule,
} from '@abacritt/angularx-social-login';

import { routes } from './app.routes';
import { env } from '@environments/environment';
import { API_URLS } from '@core/http/api-urls.token';
import { apiInterceptor } from '@core/interceptors/api-interceptor';
import { refreshInterceptor } from '@core/interceptors/refresh-interceptor';
import { errorInterceptor } from '@core/interceptors/error-interceptor';
import { graphqlProvider } from './apollo.config';
import { translateConfig } from '@core/configs/translate.config';
import { LocaleService } from '@core/services/locale.service';
import { AppInitService } from '@core/services/app-init.service';

import { AuthState } from '@store/auth/auth.state';
import { CartState } from '@store/cart/cart.state';
import { OrdersState } from '@store/orders/orders.state';
import { ProfileState } from '@store/profile/profile.state';
import { CategoriesState } from '@store/categories/categories.state';
import { IntentionsState } from '@store/intentions/intentions.state';
import { ProductsState } from '@store/products/products.state';

registerLocaleData(en);
registerLocaleData(ka);
registerLocaleData(ru);

export const appConfig: ApplicationConfig = {
  providers: [
    graphqlProvider,
    provideBrowserGlobalErrorListeners(),

    // Store
    provideStore(
      [
        AuthState,
        CartState,
        OrdersState,
        ProfileState,
        CategoriesState,
        IntentionsState,
        ProductsState,
      ],
      withNgxsReduxDevtoolsPlugin(),
    ),

    { provide: API_URLS, useValue: env.API_URLS },

    // Router
    provideRouter(
      routes,
      withInMemoryScrolling({
        scrollPositionRestoration: 'enabled',
        anchorScrolling: 'enabled',
      }),
      withComponentInputBinding(),
    ),

    // HTTP
    provideHttpClient(
      withInterceptors([apiInterceptor, refreshInterceptor, errorInterceptor]),
      withFetch(),
    ),

    // i18n
    importProvidersFrom(TranslateModule.forRoot(translateConfig)),

    // Social login
    importProvidersFrom(SocialLoginModule),
    {
      provide: SOCIAL_AUTH_CONFIG,
      useFactory: () => {
        const platformId = inject(PLATFORM_ID);
        const hasToken = isPlatformBrowser(platformId)
          ? !!localStorage.getItem(env.TOKEN.ACCESS_TOKEN)
          : false;

        return {
          autoLogin: false,
          providers: [
            {
              id: GoogleLoginProvider.PROVIDER_ID,
              provider: new GoogleLoginProvider(env.GOOGLE_CLIENT_ID, {
                oneTapEnabled: !hasToken,
              }),
            },
          ],
          onError: console.error,
        };
      },
    },

    // App Initializer for Locale and Session Hydration
    provideAppInitializer(() => {
      const locale = inject(LocaleService);
      const appInit = inject(AppInitService);
      return locale.bootstrap().then(() => {
        void appInit.bootstrap();
      });
    }),

    provideClientHydration(withEventReplay()),
  ],
};
