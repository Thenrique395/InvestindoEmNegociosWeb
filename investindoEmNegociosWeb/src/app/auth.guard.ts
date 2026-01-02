import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';

/**
 * Bloqueia rotas privadas para usuários sem token.
 * Redireciona para /login se não houver access_token no localStorage.
 */
export const authGuard: CanActivateFn = () => {
  const router = inject(Router);
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
  if (token) return true;

  return router.parseUrl('/login') as UrlTree;
};
