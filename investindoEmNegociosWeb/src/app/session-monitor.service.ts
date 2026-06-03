import { Inject, Injectable, NgZone, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { UiFeedbackService } from './ui-feedback.service';

type SessionMonitorOptions = {
  isProtectedRoute: () => boolean;
  onSessionExpired: () => void;
};

@Injectable({ providedIn: 'root' })
export class SessionMonitorService {
  private readonly isBrowser: boolean;
  private readonly sessionIdleTimeoutMs = 60 * 60 * 1000;
  private readonly sessionRefreshWindowMs = 2 * 60 * 1000;
  private readonly sessionCheckIntervalMs = 30 * 1000;
  private readonly activityEvents: Array<keyof WindowEventMap> = ['click', 'keydown', 'mousemove', 'scroll', 'touchstart'];
  private lastActivityAt = Date.now();
  private monitorId: ReturnType<typeof setInterval> | null = null;
  private refreshInFlight = false;
  private expiryRedirectScheduled = false;
  private options: SessionMonitorOptions | null = null;

  constructor(
    @Inject(PLATFORM_ID) platformId: object,
    private readonly ngZone: NgZone,
    private readonly router: Router,
    private readonly authService: AuthService,
    private readonly uiFeedback: UiFeedbackService
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  start(options: SessionMonitorOptions): void {
    if (!this.isBrowser) return;
    this.stop();
    this.options = options;
    this.markActivity();
    this.registerActivityListeners();
    this.ngZone.runOutsideAngular(() => {
      this.monitorId = setInterval(() => {
        this.ngZone.run(() => this.checkSessionHealth());
      }, this.sessionCheckIntervalMs);
    });
  }

  stop(): void {
    if (this.monitorId) {
      clearInterval(this.monitorId);
      this.monitorId = null;
    }
    this.unregisterActivityListeners();
    this.refreshInFlight = false;
  }

  markActivity(): void {
    this.lastActivityAt = Date.now();
  }

  scheduleExpiredSessionRedirect(): void {
    if (!this.isBrowser || this.expiryRedirectScheduled) return;
    this.expiryRedirectScheduled = true;
    setTimeout(() => {
      this.expiryRedirectScheduled = false;
      this.expireSession('Sessão expirada. Faça login novamente.');
    }, 0);
  }

  private registerActivityListeners(): void {
    if (!this.isBrowser || typeof window === 'undefined') return;
    this.activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, this.handleUserActivity, { passive: true });
    });
  }

  private unregisterActivityListeners(): void {
    if (!this.isBrowser || typeof window === 'undefined') return;
    this.activityEvents.forEach((eventName) => {
      window.removeEventListener(eventName, this.handleUserActivity);
    });
  }

  private readonly handleUserActivity = (): void => {
    this.markActivity();
  };

  private expireSession(message: string): void {
    this.authService.clearSession();
    this.options?.onSessionExpired();
    this.refreshInFlight = false;
    if (!this.router.url.startsWith('/login')) {
      this.uiFeedback.warning(message);
      this.router.navigateByUrl('/login');
    }
  }

  private checkSessionHealth(): void {
    if (!this.isBrowser) return;

    if (!this.authService.isAuthenticated()) {
      if (this.options?.isProtectedRoute()) {
        this.expireSession('Sessão expirada. Faça login novamente.');
      }
      return;
    }

    const now = Date.now();
    const idleMs = now - this.lastActivityAt;
    if (idleMs >= this.sessionIdleTimeoutMs) {
      this.expireSession('Sessão encerrada por inatividade. Faça login novamente.');
      return;
    }

    const expiresAtMs = this.authService.getAccessTokenExpiresAtMs();
    if (!expiresAtMs || this.refreshInFlight) return;

    const remainingMs = expiresAtMs - now;
    if (remainingMs > this.sessionRefreshWindowMs) return;

    const refreshToken = this.authService.getRefreshToken();
    if (!refreshToken) {
      if (remainingMs <= 0) {
        this.expireSession('Sessão expirada. Faça login novamente.');
      }
      return;
    }

    this.refreshInFlight = true;
    this.authService.refresh(refreshToken).subscribe({
      next: () => {
        this.refreshInFlight = false;
      },
      error: () => {
        this.refreshInFlight = false;
        this.expireSession('Sessão expirada. Faça login novamente.');
      }
    });
  }
}
