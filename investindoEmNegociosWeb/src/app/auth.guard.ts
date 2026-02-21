import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from './auth.service';

/**
 * Bloqueia rotas privadas para usuários sem token.
 * Redireciona para /login se não houver access_token no localStorage.
 */
export const authGuard: CanActivateFn = () => {
  const router = inject(Router);
  const auth = inject(AuthService);
  const platformId = inject(PLATFORM_ID);

  // No SSR não há acesso ao localStorage; evita redirecionamento incorreto no refresh.
  if (!isPlatformBrowser(platformId)) return true;

  if (auth.isAuthenticated()) return true;

  return router.parseUrl('/login') as UrlTree;
};
