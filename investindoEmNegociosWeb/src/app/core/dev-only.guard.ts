import { inject, isDevMode } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';

/**
 * Bloqueia rotas que só existem para inspeção em desenvolvimento (ex.: /styleguide) — nunca
 * acessíveis em produção, mesmo por URL direta.
 */
export const devOnlyGuard: CanActivateFn = (): boolean | UrlTree => {
  if (isDevMode()) return true;

  const router = inject(Router);
  return router.parseUrl('/');
};
