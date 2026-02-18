import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from './auth.service';

/**
 * Bloqueia rotas privadas para usuários sem token.
 * Redireciona para /login se não houver access_token no localStorage.
 */
export const authGuard: CanActivateFn = () => {
  const router = inject(Router);
  const auth = inject(AuthService);
  if (auth.isAuthenticated()) return true;

  return router.parseUrl('/login') as UrlTree;
};
