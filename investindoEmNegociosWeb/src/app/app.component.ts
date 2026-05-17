import { Component, HostBinding, HostListener, OnDestroy, OnInit, NgZone } from '@angular/core';
import { Router, RouterOutlet, NavigationEnd, RouterLink, RouterLinkActive } from '@angular/router';
import { NgIf, NgFor, NgClass, isPlatformBrowser } from '@angular/common';
import { SignupComponent } from './signup/signup.component';
import { Subscription } from 'rxjs';
import { ProfileService, UserProfile } from './profile.service';
import { AuthService } from './auth.service';
import { hasAtLeastRole, UserRole } from './roles';
import { APP_FEATURE_KEYS, AppFeatureKey, hasFeatureForRole } from './features';
import { ApiDataService } from './data/api-data.service';
import { getInitialCurrency, getInitialLocale, persistLocaleSettings, setLocaleSettings } from './utils/locale-settings';
import { NotificationsService, NotificationItem } from './notifications.service';
import { UiFeedbackMessage, UiFeedbackService } from './ui-feedback.service';
import { Inject, PLATFORM_ID } from '@angular/core';
import { ThemeService } from './theme.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [NgIf, NgFor, NgClass, RouterOutlet, RouterLink, RouterLinkActive, SignupComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'Investindo em Negócios';
  brandName = 'Investindo em Negócios';
  brandSlogan = 'Finanças com clareza, controle e confiança.';
  readonly features = APP_FEATURE_KEYS;
  isLoginRoute = false;
  isReceitasRoute = false;
  isLightTheme = false;
  showSignupModal = false;
  signupAlert = '';
  userMenuOpen = false;
  notificationsOpen = false;
  notifications: NotificationItem[] = [];
  unreadCount = 0;
  notificationsLoading = false;
  notificationsError = '';
  sidebarOpen = false;
  profile: UserProfile | null = null;
  feedbackMessage: UiFeedbackMessage | null = null;
  @HostBinding('class.light') get lightClass(): boolean {
    return this.isLightTheme;
  }
  private sub: Subscription;
  private profileSub?: Subscription;
  private feedbackSub?: Subscription;
  private userContextInitialized = false;
  private readonly isBrowser: boolean;
  private lastActivityAt = Date.now();
  private sessionMonitorId: ReturnType<typeof setInterval> | null = null;
  private readonly sessionIdleTimeoutMs = 60 * 60 * 1000;
  private readonly sessionRefreshWindowMs = 2 * 60 * 1000;
  private readonly sessionCheckIntervalMs = 30 * 1000;
  private readonly activityEvents: Array<keyof WindowEventMap> = ['click', 'keydown', 'mousemove', 'scroll', 'touchstart'];
  private sessionRefreshInFlight = false;
  private sessionExpiryRedirectScheduled = false;

  constructor(
    @Inject(PLATFORM_ID) platformId: object,
    private ngZone: NgZone,
    private router: Router,
    private profileService: ProfileService,
    private authService: AuthService,
    private apiDataService: ApiDataService,
    private notificationsService: NotificationsService,
    private uiFeedback: UiFeedbackService,
    private themeService: ThemeService
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    this.sub = this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.isLoginRoute = event.urlAfterRedirects.startsWith('/login') || event.urlAfterRedirects.startsWith('/register');
        this.isReceitasRoute = event.urlAfterRedirects.startsWith('/receitas');
        this.userMenuOpen = false;
        this.notificationsOpen = false;
        this.sidebarOpen = false;
        if (this.isLogged) {
          this.ensureUserContext();
          if (!event.urlAfterRedirects.startsWith('/receitas')) {
            this.apiDataService.refresh();
          }
        } else {
          this.resetUserContext();
        }
      }
    });
  }

  ngOnInit(): void {
    const theme = this.themeService.init();
    this.isLightTheme = theme === 'light';
    const initialLocale = getInitialLocale();
    const initialCurrency = getInitialCurrency();
    if (typeof document !== 'undefined') {
      document.documentElement.lang = initialLocale;
    }
    setLocaleSettings({ locale: initialLocale, currency: initialCurrency });
    if (this.isLogged) this.ensureUserContext();
    this.startSessionMonitor();
    this.feedbackSub = this.uiFeedback.message$.subscribe((message) => {
      this.feedbackMessage = message;
    });
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
    this.profileSub?.unsubscribe();
    this.feedbackSub?.unsubscribe();
    this.stopSessionMonitor();
  }

  goToLogin(): void {
    this.router.navigateByUrl('/login');
  }

  openSignup(): void {
    this.showSignupModal = true;
  }

  closeSignup(): void {
    this.showSignupModal = false;
  }

  handleSignupDone(): void {
    this.showSignupModal = false;
    this.signupAlert = 'Conta criada com sucesso. Faça login para entrar.';
    setTimeout(() => (this.signupAlert = ''), 5000);
  }

  dismissFeedback(): void {
    this.uiFeedback.clear();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as Element | null;
    if (!target) return;

    if (this.notificationsOpen && !target.closest('.notifications')) {
      this.notificationsOpen = false;
    }

    if (this.userMenuOpen && !target.closest('.user-menu')) {
      this.userMenuOpen = false;
    }
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    this.userMenuOpen = false;
    this.notificationsOpen = false;
    this.sidebarOpen = false;
  }

  @HostListener('window:focus')
  onWindowFocus(): void {
    this.markActivity();
  }

  @HostListener('document:visibilitychange')
  onVisibilityChange(): void {
    if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
      this.markActivity();
    }
  }

  logout(): void {
    this.authService.clearSession();
    this.resetUserContext();
    this.router.navigateByUrl('/');
  }

  get isLogged(): boolean {
    const authenticated = this.authService.isAuthenticated();
    if (!authenticated && this.isBrowser && this.isProtectedRoute(this.getCurrentPath())) {
      this.scheduleExpiredSessionRedirect();
    }
    return authenticated;
  }

  get isPublicLayoutRoute(): boolean {
    return this.isPublicLayoutRoutePath(this.getCurrentPath());
  }

  get showPublicExperience(): boolean {
    return !this.isLogged && this.isPublicLayoutRoute && this.router.navigated;
  }

  isActiveRoute(path: string): boolean {
    return this.getCurrentPath().startsWith(path);
  }

  get displayName(): string {
    return this.profile?.fullName?.trim() || 'Usuário';
  }

  get avatarUrl(): string {
    return this.profile?.avatarUrl || '';
  }

  get userInitials(): string {
    const name = this.displayName.trim();
    if (!name) return 'U';
    const parts = name.split(/\s+/).filter(Boolean);
    const first = parts.shift() || '';
    const last = parts.pop() || '';
    const initials = `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
    return initials || first.charAt(0).toUpperCase() || 'U';
  }

  private get storage(): Storage | null {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
      ? window.localStorage
      : null;
  }

  private getCurrentPath(): string {
    if (this.isBrowser && typeof window !== 'undefined') {
      return (window.location.pathname || '/').split('?')[0];
    }
    return (this.router.url || '/').split('?')[0];
  }

  private isPublicLayoutRoutePath(current: string): boolean {
    return current === '/'
      || current.startsWith('/planos')
      || current.startsWith('/checkout')
      || current.startsWith('/login')
      || current.startsWith('/register')
      || current.startsWith('/design-lab')
      || current.startsWith('/calculadora')
      || current.startsWith('/forgot-password')
      || current.startsWith('/reset-password');
  }

  private isProtectedRoute(path: string): boolean {
    return !this.isPublicLayoutRoutePath(path);
  }

  get currentRole(): UserRole | null {
    return this.authService.getRole();
  }

  hasAccess(minRole: UserRole): boolean {
    return hasAtLeastRole(this.currentRole, minRole);
  }

  hasFeature(featureKey: AppFeatureKey): boolean {
    return hasFeatureForRole(this.currentRole, featureKey);
  }

  toggleTheme(): void {
    const theme = this.themeService.toggle();
    this.isLightTheme = theme === 'light';
  }

  toggleUserMenu(): void {
    this.userMenuOpen = !this.userMenuOpen;
    if (this.userMenuOpen) {
      this.notificationsOpen = false;
    }
  }

  toggleNotifications(): void {
    this.notificationsOpen = !this.notificationsOpen;
    if (this.notificationsOpen) {
      this.userMenuOpen = false;
    }
    if (this.notificationsOpen && !this.notifications.length) {
      this.fetchNotifications();
    }
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  closeSidebar(): void {
    this.sidebarOpen = false;
  }

  refreshNotifications(): void {
    this.notificationsError = '';
    this.notificationsLoading = true;
    this.notificationsService.generate().subscribe({
      next: () => this.fetchNotifications(),
      error: () => {
        this.notificationsError = 'Falha ao atualizar.';
        this.fetchNotifications();
      }
    });
  }

  markNotificationRead(item: NotificationItem, event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    if (item.readAt) return;
    this.notificationsService.markRead(item.id).subscribe({
      next: () => {
        item.readAt = new Date().toISOString();
        this.recalculateUnread();
      },
      error: () => {
        /* ignore */
      }
    });
  }

  private fetchNotifications(): void {
    this.notificationsLoading = true;
    this.notificationsService.list(false, 20).subscribe({
      next: (items) => {
        this.notifications = items || [];
        this.recalculateUnread();
        this.notificationsError = '';
      },
      error: () => {
        this.notifications = [];
        this.unreadCount = 0;
        this.notificationsError = 'Não foi possível carregar.';
      },
      complete: () => {
        this.notificationsLoading = false;
      }
    });
  }

  private recalculateUnread(): void {
    this.unreadCount = this.notifications.filter((n) => !n.readAt).length;
  }

  reloadIfSame(path: string, event?: Event): void {
    const currentPath = this.router.url.split('?')[0];
    if (currentPath === path) {
      event?.preventDefault();
      if (path === '/receitas') {
        this.apiDataService.refreshIncomes();
      } else {
        this.apiDataService.refresh();
      }
    }
  }

  goToPreferences(event?: Event): void {
    event?.preventDefault();
    this.closeSidebar();

    const currentPath = this.router.url.split('?')[0];
    if (currentPath === '/preferencias') {
      this.apiDataService.refresh();
      return;
    }

    this.router.navigateByUrl('/preferencias');
  }

  private ensureUserContext(): void {
    if (!this.profileSub) {
      this.profileSub = this.profileService.profile$.subscribe((profile) => {
        this.profile = profile;
      });
    }

    this.profileService.getProfile().subscribe({
      error: () => {
        /* ignore */
      }
    });

    if (this.userContextInitialized) return;
    this.userContextInitialized = true;

    this.profileService.getPreferences().subscribe({
      next: (prefs) => {
        const locale = prefs.locales?.[0] || 'pt-BR';
        const currency = prefs.currency || 'BRL';
        if (typeof document !== 'undefined') {
          document.documentElement.lang = locale;
        }
        setLocaleSettings({ locale, currency });
        persistLocaleSettings(locale, currency);
      },
      error: () => {
        /* ignore */
      }
    });
    this.refreshNotifications();
  }

  private resetUserContext(): void {
    this.profileSub?.unsubscribe();
    this.profileSub = undefined;
    this.profile = null;
    this.userContextInitialized = false;
    this.notifications = [];
    this.unreadCount = 0;
  }

  private startSessionMonitor(): void {
    if (!this.isBrowser) return;
    this.stopSessionMonitor();
    this.lastActivityAt = Date.now();
    this.registerActivityListeners();
    this.ngZone.runOutsideAngular(() => {
      this.sessionMonitorId = setInterval(() => {
        this.ngZone.run(() => this.checkSessionHealth());
      }, this.sessionCheckIntervalMs);
    });
  }

  private stopSessionMonitor(): void {
    if (this.sessionMonitorId) {
      clearInterval(this.sessionMonitorId);
      this.sessionMonitorId = null;
    }
    this.unregisterActivityListeners();
    this.sessionRefreshInFlight = false;
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

  private markActivity(): void {
    this.lastActivityAt = Date.now();
  }

  private scheduleExpiredSessionRedirect(): void {
    if (this.sessionExpiryRedirectScheduled) return;
    this.sessionExpiryRedirectScheduled = true;
    setTimeout(() => {
      this.sessionExpiryRedirectScheduled = false;
      this.expireSession('Sessão expirada. Faça login novamente.');
    }, 0);
  }

  private expireSession(message: string): void {
    this.authService.clearSession();
    this.resetUserContext();
    this.userMenuOpen = false;
    this.notificationsOpen = false;
    this.sidebarOpen = false;
    this.sessionRefreshInFlight = false;
    if (!this.router.url.startsWith('/login')) {
      this.uiFeedback.warning(message);
      this.router.navigateByUrl('/login');
    }
  }

  private checkSessionHealth(): void {
    if (!this.isBrowser) return;

    if (!this.authService.isAuthenticated()) {
      if (this.isProtectedRoute(this.getCurrentPath())) {
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
    if (!expiresAtMs || this.sessionRefreshInFlight) return;

    const remainingMs = expiresAtMs - now;
    if (remainingMs > this.sessionRefreshWindowMs) return;

    const refreshToken = this.authService.getRefreshToken();
    if (!refreshToken) {
      if (remainingMs <= 0) {
        this.expireSession('Sessão expirada. Faça login novamente.');
      }
      return;
    }

    this.sessionRefreshInFlight = true;
    this.authService.refresh(refreshToken).subscribe({
      next: () => {
        this.sessionRefreshInFlight = false;
      },
      error: () => {
        this.sessionRefreshInFlight = false;
        this.expireSession('Sessão expirada. Faça login novamente.');
      }
    });
  }

  trackByIndex(index: number): number {
    return index;
  }
}
