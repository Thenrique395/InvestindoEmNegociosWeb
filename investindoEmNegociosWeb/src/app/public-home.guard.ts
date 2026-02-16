import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';

/**
 * Rota pública inicial:
 * - usuário deslogado: mantém home comercial
 * - usuário logado: redireciona para dashboard
 */
export const publicHomeGuard: CanActivateFn = () => {
  const router = inject(Router);
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
  if (!token) return true;

  return router.parseUrl('/dashboard') as UrlTree;
};

