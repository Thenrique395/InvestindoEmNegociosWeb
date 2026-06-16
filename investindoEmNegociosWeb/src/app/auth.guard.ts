import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthService } from './auth.service';
import { OnboardingService } from './onboarding.service';

/**
 * Bloqueia rotas privadas para usuários sem token e segura o usuário no onboarding
 * até a configuração inicial ser concluída.
 */
export const authGuard: CanActivateFn = (_route, state) => {
  const router = inject(Router);
  const auth = inject(AuthService);
  const onboarding = inject(OnboardingService);
  const platformId = inject(PLATFORM_ID);

  // No SSR não há acesso ao localStorage; evita redirecionamento incorreto no refresh.
  if (!isPlatformBrowser(platformId)) return true;

  if (!auth.isAuthenticated()) {
    return router.parseUrl('/login') as UrlTree;
  }

  const targetUrl = (state.url || '/').split('?')[0];
  if (targetUrl.startsWith('/onboarding')) return true;

  return onboarding.getStatus().pipe(
    map((status) => status.completed ? true : router.parseUrl('/onboarding')),
    catchError((err: unknown) => {
      const status = (err as { status?: number })?.status;
      if (!status || status === 401 || status === 403) {
        return of(router.parseUrl('/login'));
      }
      return of(router.parseUrl('/onboarding'));
    })
  );
};
