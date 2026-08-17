import { isPlatformBrowser } from '@angular/common';
import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { hasAtLeastRole, UserRole } from './roles';
import { SessionMonitorService } from './session-monitor.service';

@Injectable({ providedIn: 'root' })
export class AppSessionFacadeService {
  private readonly isBrowser: boolean;

  constructor(
    @Inject(PLATFORM_ID) platformId: object,
    private readonly router: Router,
    private readonly authService: AuthService,
    private readonly sessionMonitor: SessionMonitorService
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  startMonitoring(onSessionExpired: () => void): void {
    this.sessionMonitor.start({
      isProtectedRoute: () => this.isProtectedRoute(this.getCurrentPath()),
      onSessionExpired
    });
  }

  stopMonitoring(): void {
    this.sessionMonitor.stop();
  }

  markActivity(): void {
    this.sessionMonitor.markActivity();
  }

  clearSession(): void {
    this.authService.clearSession();
  }

  isAuthenticated(): boolean {
    return this.authService.isAuthenticated();
  }

  isPublicLayoutRoute(): boolean {
    return this.isPublicLayoutRoutePath(this.getCurrentPath());
  }

  showPublicExperience(): boolean {
    return !this.isAuthenticated() && this.isPublicLayoutRoute() && this.router.navigated;
  }

  isOnboardingRoute(): boolean {
    return this.getCurrentPath().startsWith('/onboarding');
  }

  isStyleguideRoute(): boolean {
    return this.getCurrentPath().startsWith('/styleguide');
  }

  isActiveRoute(path: string): boolean {
    return this.getCurrentPath().startsWith(path);
  }

  getCurrentPath(): string {
    if (this.isBrowser && typeof window !== 'undefined') {
      return (window.location.pathname || '/').split('?')[0];
    }
    return (this.router.url || '/').split('?')[0];
  }

  isBrowserEnvironment(): boolean {
    return this.isBrowser;
  }

  getCurrentRole(): UserRole | null {
    return this.authService.getRole();
  }

  hasAccess(minRole: UserRole): boolean {
    return hasAtLeastRole(this.getCurrentRole(), minRole);
  }

  private isProtectedRoute(path: string): boolean {
    return !this.isPublicLayoutRoutePath(path);
  }

  private isPublicLayoutRoutePath(current: string): boolean {
    return current === '/'
      || current.startsWith('/produto')
      || current.startsWith('/termos')
      || current.startsWith('/privacidade')
      || current.startsWith('/planos')
      || current.startsWith('/checkout')
      || current.startsWith('/login')
      || current.startsWith('/register')
      || current.startsWith('/calculadora')
      || current.startsWith('/forgot-password')
      || current.startsWith('/reset-password');
  }
}
