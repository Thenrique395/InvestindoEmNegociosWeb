import { Component, HostBinding, HostListener, OnDestroy, OnInit } from '@angular/core';
import { Router, RouterOutlet, NavigationEnd, RouterLink } from '@angular/router';
import { NgClass } from '@angular/common';
import { SignupComponent } from './signup/signup.component';
import { Subscription } from 'rxjs';
import { UserRole } from './roles';
import { ApiDataService } from './data/api-data.service';
import { NotificationItem } from './notifications.service';
import { NotificationsFacadeService } from './notifications-facade.service';
import { UiFeedbackMessage, UiFeedbackService } from './ui-feedback.service';
import { ThemeService } from './theme.service';
import { SidebarComponent } from './sidebar/sidebar.component';
import { TopbarComponent } from './topbar/topbar.component';
import { PublicHeaderComponent } from './public-header/public-header.component';
import { PublicNavigationService } from './public-navigation.service';
import { UserContextFacadeService } from './user-context-facade.service';
import { UserPreferencesFacadeService } from './user-preferences-facade.service';
import { AppSessionFacadeService } from './app-session-facade.service';

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
    private router: Router,
    private apiDataService: ApiDataService,
    private notificationsFacade: NotificationsFacadeService,
    private uiFeedback: UiFeedbackService,
    private themeService: ThemeService,
    private publicNavigation: PublicNavigationService,
    private userContextFacade: UserContextFacadeService,
    private userPreferencesFacade: UserPreferencesFacadeService,
    private appSession: AppSessionFacadeService
  ) {
    this.isBrowser = this.appSession.isBrowserEnvironment();
    this.sub = this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.handleNavigationEnd(event);
      }
    });
  }

  ngOnInit(): void {
    const theme = this.themeService.init();
    this.isLightTheme = theme === 'light';
    this.userPreferencesFacade.initFromStorage();
    if (this.isLogged && !this.isOnboardingRoute) this.ensureUserContext();
    this.appSession.startMonitoring(() => this.handleExpiredSession());
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
    this.appSession.stopMonitoring();
  }

  goToLogin(): void {
    this.router.navigateByUrl('/login');
  }

  goToPublicHome(event?: Event): void {
    this.publicNavigation.goToPublicHome(this.appSession.getCurrentPath(), this.isBrowser, event);
  }

  scrollToPublicSection(sectionId: string, event?: Event): void {
    this.publicNavigation.scrollToPublicSection(sectionId, this.appSession.getCurrentPath(), this.isBrowser, event);
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
    this.appSession.markActivity();
  }

  @HostListener('document:visibilitychange')
  onVisibilityChange(): void {
    if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
      this.appSession.markActivity();
    }
  }

  logout(): void {
    this.appSession.clearSession();
    this.resetUserContext();
    this.router.navigateByUrl('/');
  }

  get isLogged(): boolean {
    return this.appSession.isAuthenticated();
  }

  get isPublicLayoutRoute(): boolean {
    return this.appSession.isPublicLayoutRoute();
  }

  get showPublicExperience(): boolean {
    return this.appSession.showPublicExperience();
  }

  get isOnboardingRoute(): boolean {
    return this.appSession.isOnboardingRoute();
  }

  isActiveRoute(path: string): boolean {
    return this.appSession.isActiveRoute(path);
  }

  get currentRole(): UserRole | null {
    return this.appSession.getCurrentRole();
  }

  hasAccess(minRole: UserRole): boolean {
    return this.appSession.hasAccess(minRole);
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

    this.userPreferencesFacade.loadRemotePreferences();
    this.notificationsFacade.refresh();
  }

  private handleNavigationEnd(event: NavigationEnd): void {
    const currentPath = event.urlAfterRedirects.split('?')[0];
    this.isLoginRoute = currentPath.startsWith('/login') || currentPath.startsWith('/register');
    this.isReceitasRoute = currentPath.startsWith('/receitas');
    this.closeTransientUi();

    if (this.isLogged) {
      this.handleAuthenticatedRoute(currentPath);
      return;
    }

    this.resetUserContext();
  }

  private handleAuthenticatedRoute(currentPath: string): void {
    if (currentPath.startsWith('/onboarding')) return;

    this.ensureUserContext();
    if (!currentPath.startsWith('/receitas')) {
      this.apiDataService.refresh();
    }
  }

  private closeTransientUi(): void {
    this.userMenuOpen = false;
    this.notificationsFacade.close();
    this.sidebarOpen = false;
  }

  private resetUserContext(): void {
    this.userContextFacade.reset();
    this.userContextInitialized = false;
    this.notificationsFacade.reset();
  }

  private handleExpiredSession(): void {
    this.resetUserContext();
    this.closeTransientUi();
  }

}
