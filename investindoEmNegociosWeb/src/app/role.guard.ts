import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from './auth.service';
import { hasAtLeastRole, UserRole } from './roles';
import { AppFeatureKey, hasFeatureForRole } from './features';

export const roleGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);
  const minRole = route.data?.['minRole'] as UserRole | undefined;
  const feature = route.data?.['feature'] as AppFeatureKey | undefined;

  if (!isPlatformBrowser(platformId)) return true;

  const current = auth.getRole();
  if (!current) {
    return router.parseUrl('/login') as UrlTree;
  }

  if (minRole && !hasAtLeastRole(current, minRole)) {
    return router.parseUrl('/dashboard') as UrlTree;
  }

  if (feature && !hasFeatureForRole(current, feature)) {
    return router.parseUrl('/dashboard') as UrlTree;
  }

  return true;
};
