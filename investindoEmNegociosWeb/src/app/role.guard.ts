import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from './auth.service';
import { hasAtLeastRole, UserRole } from './roles';

export const roleGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const minRole = route.data?.['minRole'] as UserRole | undefined;

  if (!minRole) return true;

  const current = auth.getRole();
  if (!current) {
    return router.parseUrl('/login') as UrlTree;
  }

  if (hasAtLeastRole(current, minRole)) return true;
  return router.parseUrl('/dashboard') as UrlTree;
};
