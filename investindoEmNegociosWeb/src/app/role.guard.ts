import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from './auth.service';
import { hasAtLeastRole, UserRole } from './roles';

export const roleGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);
  const minRole = route.data?.['minRole'] as UserRole | undefined;

  if (!minRole) return true;
  if (!isPlatformBrowser(platformId)) return true;

  const current = auth.getRole();
  if (!current) {
    return router.parseUrl('/login') as UrlTree;
  }

  if (hasAtLeastRole(current, minRole)) return true;
  return router.parseUrl('/dashboard') as UrlTree;
};
