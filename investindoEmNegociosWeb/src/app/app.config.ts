import { ApplicationConfig, provideZoneChangeDetection, LOCALE_ID, isDevMode } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import localeEn from '@angular/common/locales/en';
import { provideRouter, RouteReuseStrategy, withRouterConfig, withPreloading, withInMemoryScrolling } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { provideClientHydration } from '@angular/platform-browser';
import { authInterceptor } from './auth.interceptor';
import { NoReuseStrategy } from './no-reuse.strategy';
import { getInitialLocale } from './utils/locale-settings';
import { SelectivePreloadingStrategy } from './selective-preloading.strategy';
import { provideServiceWorker } from '@angular/service-worker';

registerLocaleData(localePt);
registerLocaleData(localeEn);

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(
      routes,
      withRouterConfig({ onSameUrlNavigation: 'reload' }),
      withPreloading(SelectivePreloadingStrategy),
      withInMemoryScrolling({ scrollPositionRestoration: 'top', anchorScrolling: 'enabled' })
    ),
    provideClientHydration(),
    provideHttpClient(withFetch(), withInterceptors([authInterceptor])),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000'
    }),
    { provide: RouteReuseStrategy, useClass: NoReuseStrategy },
    { provide: LOCALE_ID, useFactory: () => getInitialLocale() }
  ]
};
