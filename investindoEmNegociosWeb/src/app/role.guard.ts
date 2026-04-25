import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from './auth.service';
import { hasAtLeastRole, UserRole } from './roles';
import { APP_FEATURE_KEYS, AppFeatureKey, hasFeatureForRole } from './features';

const AVAILABLE_FEATURES = new Set<string>(Object.values(APP_FEATURE_KEYS));

/**
 * Guards private routes by role and feature.
 *
 * Backend remains the source of truth for authorization.
 * This guard only prevents the user from navigating to screens that are known
 * to be unavailable for the current role/features in the frontend shell.
 */
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

  if (feature && !AVAILABLE_FEATURES.has(feature)) {
    console.warn(`[roleGuard] Feature key not registered in APP_FEATURE_KEYS: ${feature}`);
    return router.parseUrl('/dashboard') as UrlTree;
  }

  if (feature && !hasFeatureForRole(current, feature)) {
    return router.parseUrl('/dashboard') as UrlTree;
  }

  if (minRole && !hasAtLeastRole(current, minRole)) {
    return router.parseUrl('/dashboard') as UrlTree;
  }

  return true;
};
