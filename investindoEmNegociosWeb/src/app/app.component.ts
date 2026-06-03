import { Component, HostBinding, HostListener, OnDestroy, OnInit } from '@angular/core';
import { Router, RouterOutlet, NavigationEnd, RouterLink } from '@angular/router';
import { NgClass, isPlatformBrowser } from '@angular/common';
import { SignupComponent } from './signup/signup.component';
import { Subscription } from 'rxjs';
import { ProfileService } from './profile.service';
import { AuthService } from './auth.service';
import { hasAtLeastRole, UserRole } from './roles';
import { ApiDataService } from './data/api-data.service';
import { getInitialCurrency, getInitialLocale, persistLocaleSettings, setLocaleSettings } from './utils/locale-settings';
import { NotificationItem } from './notifications.service';
import { NotificationsFacadeService } from './notifications-facade.service';
import { UiFeedbackMessage, UiFeedbackService } from './ui-feedback.service';
import { Inject, PLATFORM_ID } from '@angular/core';
import { ThemeService } from './theme.service';
import { SessionMonitorService } from './session-monitor.service';
import { SidebarComponent } from './sidebar/sidebar.component';
import { TopbarComponent } from './topbar/topbar.component';
import { PublicHeaderComponent } from './public-header/public-header.component';
import { PublicNavigationService } from './public-navigation.service';
import { UserContextFacadeService } from './user-context-facade.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [NgClass, RouterOutlet, RouterLink, SignupComponent, SidebarComponent, TopbarComponent, PublicHeaderComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'Investindo em Negócios';
  brandName = 'Investindo em Negócios';
  brandSlogan = 'Finanças com clareza, controle e confiança.';
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
  displayName = 'Usuário';
  avatarUrl = '';
  userInitials = 'U';
  feedbackMessage: UiFeedbackMessage | null = null;
  @HostBinding('class.light') get lightClass(): boolean {
    return this.isLightTheme;
  }
  private sub: Subscription;
  private feedbackSub?: Subscription;
  private notificationsSub?: Subscription;
  private userContextSub?: Subscription;
  private userContextInitialized = false;
  private readonly isBrowser: boolean;

  constructor(
    @Inject(PLATFORM_ID) platformId: object,
    private router: Router,
    private profileService: ProfileService,
    private authService: AuthService,
    private apiDataService: ApiDataService,
    private notificationsFacade: NotificationsFacadeService,
    private uiFeedback: UiFeedbackService,
    private themeService: ThemeService,
    private sessionMonitor: SessionMonitorService,
    private publicNavigation: PublicNavigationService,
    private userContextFacade: UserContextFacadeService
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    this.sub = this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.isLoginRoute = event.urlAfterRedirects.startsWith('/login') || event.urlAfterRedirects.startsWith('/register');
        this.isReceitasRoute = event.urlAfterRedirects.startsWith('/receitas');
        const isOnboardingRoute = event.urlAfterRedirects.split('?')[0].startsWith('/onboarding');
        this.userMenuOpen = false;
        this.notificationsFacade.close();
        this.sidebarOpen = false;
        if (this.isLogged) {
          if (!isOnboardingRoute) {
            this.ensureUserContext();
          }
          if (!isOnboardingRoute && !event.urlAfterRedirects.startsWith('/receitas')) {
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
    if (this.isLogged && !this.isOnboardingRoute) this.ensureUserContext();
    this.sessionMonitor.start({
      isProtectedRoute: () => this.isProtectedRoute(this.getCurrentPath()),
      onSessionExpired: () => this.handleExpiredSession()
    });
    this.feedbackSub = this.uiFeedback.message$.subscribe((message) => {
      this.feedbackMessage = message;
    });
    this.notificationsSub = this.notificationsFacade.state$.subscribe((state) => {
      this.notificationsOpen = state.open;
      this.notifications = state.items;
      this.unreadCount = state.unreadCount;
      this.notificationsLoading = state.loading;
      this.notificationsError = state.error;
    });
    this.userContextSub = this.userContextFacade.state$.subscribe((state) => {
      this.displayName = state.displayName;
      this.avatarUrl = state.avatarUrl;
      this.userInitials = state.userInitials;
    });
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
    this.feedbackSub?.unsubscribe();
    this.notificationsSub?.unsubscribe();
    this.userContextSub?.unsubscribe();
    this.sessionMonitor.stop();
  }

  goToLogin(): void {
    this.router.navigateByUrl('/login');
  }

  goToPublicHome(event?: Event): void {
    this.publicNavigation.goToPublicHome(this.getCurrentPath(), this.isBrowser, event);
  }

  scrollToPublicSection(sectionId: string, event?: Event): void {
    this.publicNavigation.scrollToPublicSection(sectionId, this.getCurrentPath(), this.isBrowser, event);
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

    const publicAnchor = target.closest<HTMLAnchorElement>('a[href^="/#"]');
    if (publicAnchor) {
      const sectionId = publicAnchor.getAttribute('href')?.split('#')[1];
      if (sectionId) {
        this.scrollToPublicSection(sectionId, event);
        return;
      }
    }

    const publicHome = target.closest<HTMLAnchorElement>('.menu a[href="/"]');
    if (publicHome) {
      this.goToPublicHome(event);
      return;
    }

    if (this.notificationsOpen && !target.closest('.notifications')) {
      this.notificationsFacade.close();
    }

    if (this.userMenuOpen && !target.closest('.user-menu')) {
      this.userMenuOpen = false;
    }
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    this.userMenuOpen = false;
    this.notificationsFacade.close();
    this.sidebarOpen = false;
  }

  @HostListener('window:focus')
  onWindowFocus(): void {
    this.sessionMonitor.markActivity();
  }

  @HostListener('document:visibilitychange')
  onVisibilityChange(): void {
    if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
      this.sessionMonitor.markActivity();
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
      this.sessionMonitor.scheduleExpiredSessionRedirect();
    }
    return authenticated;
  }

  get isPublicLayoutRoute(): boolean {
    return this.isPublicLayoutRoutePath(this.getCurrentPath());
  }

  get showPublicExperience(): boolean {
    return !this.isLogged && this.isPublicLayoutRoute && this.router.navigated;
  }

  get isOnboardingRoute(): boolean {
    return this.getCurrentPath().startsWith('/onboarding');
  }

  isActiveRoute(path: string): boolean {
    return this.getCurrentPath().startsWith(path);
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

  toggleUserMenu(): void {
    this.userMenuOpen = !this.userMenuOpen;
    if (this.userMenuOpen) {
      this.notificationsFacade.close();
    }
  }

  toggleNotifications(): void {
    const wasOpen = this.notificationsOpen;
    this.notificationsFacade.toggle();
    if (!wasOpen) {
      this.userMenuOpen = false;
    }
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  closeSidebar(): void {
    this.sidebarOpen = false;
  }

  refreshNotifications(): void {
    this.notificationsFacade.refresh();
  }

  markNotificationRead(item: NotificationItem, event?: Event): void {
    this.notificationsFacade.markRead(item, event);
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
    this.userContextFacade.loadProfile();

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
    this.notificationsFacade.refresh();
  }

  private resetUserContext(): void {
    this.userContextFacade.reset();
    this.userContextInitialized = false;
    this.notificationsFacade.reset();
  }

  private handleExpiredSession(): void {
    this.resetUserContext();
    this.userMenuOpen = false;
    this.notificationsFacade.close();
    this.sidebarOpen = false;
  }

}
