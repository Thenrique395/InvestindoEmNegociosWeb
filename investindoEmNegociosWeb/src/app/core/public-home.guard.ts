import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from './auth.service';

/**
 * Rota pública inicial:
 * - usuário deslogado: mantém home comercial
 * - usuário logado: redireciona para dashboard
 */
export const publicHomeGuard: CanActivateFn = () => {
  const router = inject(Router);
  const auth = inject(AuthService);
  const platformId = inject(PLATFORM_ID);

  // Em SSR evita decisão baseada em sessão de localStorage.
  if (!isPlatformBrowser(platformId)) return true;

  if (!auth.isAuthenticated()) return true;

  return router.parseUrl('/dashboard') as UrlTree;
};
