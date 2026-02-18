import { inject } from '@angular/core';
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
  if (!auth.isAuthenticated()) return true;

  return router.parseUrl('/dashboard') as UrlTree;
};
