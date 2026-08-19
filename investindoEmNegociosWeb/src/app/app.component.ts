import { Component, HostBinding, HostListener, OnDestroy, OnInit } from '@angular/core';
import { Router, RouterLink, RouterOutlet, NavigationEnd } from '@angular/router';
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
import { PublicFooterComponent } from './public-footer/public-footer.component';
import { PublicNavigationService } from './public-navigation.service';
import { UserContextFacadeService } from './user-context-facade.service';
import { UserPreferencesFacadeService } from './user-preferences-facade.service';
import { AppSessionFacadeService } from './app-session-facade.service';
import { FinancialPrivacyService } from './financial-privacy.service';
import { BillingAlertBannerComponent } from './shared/billing-alert-banner/billing-alert-banner.component';
import { ModalComponent } from './shared/modal/modal.component';
import { NAV_SECTIONS, canShowItem, type SidebarNavItem } from './navigation';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, SignupComponent, SidebarComponent, TopbarComponent, PublicHeaderComponent, PublicFooterComponent, BillingAlertBannerComponent, ModalComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'Investindo em Negócios';
  brandName = 'Investindo em Negócios';
  brandSlogan = 'Finanças com clareza, controle e confiança.';
  isStandaloneAuthRoute = false;
  /**
   * Páginas do site que trazem o próprio cabeçalho e rodapé.
   * Cada uma tem um nav diferente, então o shell não pode desenhá-lo por elas.
   */
  isSiteRoute = false;
  isLightTheme = false;
  showSignupModal = false;
  signupAlert = '';
  userMenuOpen = false;
  mobileSidebarOpen = false;
  notificationsOpen = false;
  notifications: NotificationItem[] = [];
  unreadCount = 0;
  notificationsLoading = false;
  notificationsError = '';
  displayName = 'Usuário';
  avatarUrl = '';
  userInitials = 'U';
  feedbackMessage: UiFeedbackMessage | null = null;
  routeTransitionActive = true;
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
    private appSession: AppSessionFacadeService,
    private financialPrivacy: FinancialPrivacyService
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
    this.financialPrivacy.init();
    this.userPreferencesFacade.initFromStorage();
    if (this.isLogged) this.ensureUserContext();
    this.appSession.startMonitoring(() => this.handleExpiredSession());
    this.feedbackSub = this.uiFeedback.message$.subscribe((message) => {
      // Adiado para fora do ciclo de change detection atual: qualquer componente que chame
      // uiFeedback.success/error/info/warning() de forma síncrona no próprio ngOnInit (ex.:
      // LoginComponent ao detectar ?created=1) dispararia esta emissão DURANTE o ciclo de CD
      // do AppComponent (componente pai) já em andamento, mudando feedbackMessage depois dele
      // já ter sido checado — NG0100 (ExpressionChangedAfterItHasBeenChecked). Corrigido aqui,
      // na raiz, em vez de em cada chamador — protege qualquer uso futuro também.
      setTimeout(() => {
        this.feedbackMessage = message;
      });
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

    if (this.mobileSidebarOpen && !target.closest('.sidebar') && !target.closest('.menu-toggle')) {
      this.mobileSidebarOpen = false;
    }
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    this.userMenuOpen = false;
    this.mobileSidebarOpen = false;
    this.notificationsFacade.close();
  }

  toggleMobileSidebar(): void {
    this.mobileSidebarOpen = !this.mobileSidebarOpen;
  }

  closeMobileSidebar(): void {
    this.mobileSidebarOpen = false;
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

  get isStyleguideRoute(): boolean {
    return this.appSession.isStyleguideRoute();
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

  /* Barra inferior: dois destinos à esquerda do botão de novo lançamento e um
     à direita. "Início" em vez de "Dashboard" — é o nome que cabe e o que a
     pessoa espera no primeiro item de uma barra de app. */
  get mobileBottomLeft(): SidebarNavItem[] {
    return this.mobileBottomItemsFor(['/dashboard', '/despesas']).map((item) =>
      item.path === '/dashboard' ? { ...item, label: 'Início' } : item
    );
  }

  get mobileBottomRight(): SidebarNavItem[] {
    return this.mobileBottomItemsFor(['/receitas']);
  }

  /** Abre o cadastro do contexto atual; fora de receitas, cai em despesas. */
  quickAdd(): void {
    const emReceitas = this.router.url.startsWith('/receitas');
    this.router.navigate([emReceitas ? '/receitas' : '/despesas'], { queryParams: { novo: 1 } });
  }

  private mobileBottomItemsFor(paths: string[]): SidebarNavItem[] {
    const role = this.currentRole;
    const permitidos = new Set(paths);

    return NAV_SECTIONS
      .flatMap(section => section.items)
      .filter(item => permitidos.has(item.path) && canShowItem(role, item))
      .sort((a, b) => paths.indexOf(a.path) - paths.indexOf(b.path));
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

  toggleTheme(): void {
    const theme = this.themeService.toggle();
    this.isLightTheme = theme === 'light';
    // Salva a escolha no servidor (persiste por usuário, entre dispositivos) quando logado.
    if (this.appSession.isAuthenticated()) {
      this.userPreferencesFacade.saveTheme(theme);
    }
  }

  get financialValuesHidden(): boolean {
    return this.financialPrivacy.hidden();
  }

  toggleFinancialValues(): void {
    this.financialPrivacy.toggle();
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
    const currentPath = this.router.url.split('?')[0];
    if (currentPath === '/preferencias') {
      this.apiDataService.refresh();
      return;
    }

    this.router.navigateByUrl('/preferencias');
  }

  /** Rodapé da sidebar: leva ao perfil, como o handoff especifica. */
  goToProfile(event?: Event): void {
    event?.preventDefault();
    const currentPath = this.router.url.split('?')[0];
    if (currentPath === '/perfil') {
      this.apiDataService.refresh();
      return;
    }

    this.router.navigateByUrl('/perfil');
  }

  private ensureUserContext(): void {
    this.userContextFacade.loadProfile();

    if (this.userContextInitialized) return;
    this.userContextInitialized = true;

    this.userPreferencesFacade.loadRemotePreferences();
    this.notificationsFacade.refresh();
  }

  private handleNavigationEnd(event: NavigationEnd): void {
    this.restartRouteTransition();
    const currentPath = event.urlAfterRedirects.split('?')[0];
    this.isStandaloneAuthRoute =
      currentPath.startsWith('/login') ||
      currentPath.startsWith('/register') ||
      currentPath.startsWith('/forgot-password') ||
      currentPath.startsWith('/reset-password');
    // `/produto` entra aqui quando for repaginado (fase 2.3). Até lá ele
    // depende do cabeçalho e rodapé do shell, e listá-lo o deixaria sem ambos.
    this.isSiteRoute =
      currentPath === '/' ||
      currentPath === '' ||
      currentPath.startsWith('/produto') ||
      currentPath.startsWith('/planos') ||
      currentPath.startsWith('/termos') ||
      currentPath.startsWith('/privacidade');
    this.closeTransientUi();

    if (this.isLogged) {
      this.handleAuthenticatedRoute(currentPath);
      return;
    }

    this.resetUserContext();
  }

  private handleAuthenticatedRoute(currentPath: string): void {
    this.ensureUserContext();
    if (!currentPath.startsWith('/receitas')) {
      this.apiDataService.refresh();
    }
  }

  private closeTransientUi(): void {
    this.userMenuOpen = false;
    this.mobileSidebarOpen = false;
    this.notificationsFacade.close();
  }

  private restartRouteTransition(): void {
    if (!this.isBrowser) return;

    this.routeTransitionActive = false;
    requestAnimationFrame(() => {
      this.routeTransitionActive = true;
    });
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
