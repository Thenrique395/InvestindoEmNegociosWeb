import { Component, HostBinding, HostListener, OnDestroy, OnInit, NgZone } from '@angular/core';
import { Router, RouterOutlet, NavigationEnd, RouterLink, RouterLinkActive } from '@angular/router';
import { NgIf, NgFor, NgClass, isPlatformBrowser } from '@angular/common';
import { SignupComponent } from './signup/signup.component';
import { Subscription } from 'rxjs';
import { ProfileService, UserProfile } from './profile.service';
import { AuthService } from './auth.service';
import { hasAtLeastRole, UserRole } from './roles';
import { AppFeatureKey, hasFeatureForRole } from './features';
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
  private readonly sessionIdleTimeoutMs = 15 * 60 * 1000;
  private readonly sessionRefreshWindowMs = 2 * 60 * 1000;
  private readonly sessionCheckIntervalMs = 30 * 1000;
  private readonly activityEvents: Array<keyof WindowEventMap> = ['click', 'keydown', 'mousemove', 'scroll', 'touchstart'];
  private sessionRefreshInFlight = false;

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
        this.isLoginRoute = event.urlAfterRedirects.startsWith('/login');
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

  toggleTheme(): void {
    const theme = this.themeService.toggle();
    this.isLightTheme = theme === 'light';
  }

  /* resto do arquivo mantido igual */
}
