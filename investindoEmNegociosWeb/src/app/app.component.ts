import { Component, HostBinding, OnDestroy, OnInit } from '@angular/core';
import { Router, RouterOutlet, NavigationEnd, RouterLink, RouterLinkActive } from '@angular/router';
import { NgIf } from '@angular/common';
import { SignupComponent } from './signup/signup.component';
import { Subscription } from 'rxjs';
import { ProfileService, UserProfile } from './profile.service';
import { AuthService } from './auth.service';
import { hasAtLeastRole, UserRole } from './roles';
import { ApiDataService } from './data/api-data.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [NgIf, RouterOutlet, RouterLink, RouterLinkActive, SignupComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'SaldoClaro';
  brandName = 'SaldoClaro';
  brandSlogan = 'Visão clara do seu dinheiro, todo mês.';
  brandPositioning =
    'Controle receitas, despesas e metas com clareza. Alertas inteligentes e decisões mais seguras.';
  isLoginRoute = false;
  isHomeRoute = false;
  isReceitasRoute = false;
  isLightTheme = false;
  showSignupModal = false;
  signupAlert = '';
  userMenuOpen = false;
  profile: UserProfile | null = null;
  @HostBinding('class.light') get lightClass(): boolean {
    return this.isLightTheme;
  }
  private sub: Subscription;
  private profileSub?: Subscription;

  constructor(
    private router: Router,
    private profileService: ProfileService,
    private authService: AuthService,
    private apiDataService: ApiDataService
  ) {
    this.sub = this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.isLoginRoute = event.urlAfterRedirects.startsWith('/login');
        this.isHomeRoute = event.urlAfterRedirects === '/' || event.urlAfterRedirects.startsWith('/#');
        this.isReceitasRoute = event.urlAfterRedirects.startsWith('/receitas');
        this.userMenuOpen = false;
        if (this.isLogged) {
          if (!event.urlAfterRedirects.startsWith('/receitas')) {
            this.apiDataService.refresh();
          }
        }
      }
    });
  }

  ngOnInit(): void {
    this.applyTheme(false);
    if (this.isLogged) {
      this.profileSub = this.profileService.profile$.subscribe((profile) => {
        this.profile = profile;
      });
      this.profileService.getProfile().subscribe({
        error: () => {
          /* ignore */
        }
      });
      this.profileService.getPreferences().subscribe({
        next: (prefs) => {
          document.documentElement.lang = prefs.locales?.[0] || 'pt-BR';
        },
        error: () => {
          /* ignore */
        }
      });
    }
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
    this.profileSub?.unsubscribe();
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

  logout(): void {
    this.authService.clearSession();
    this.profile = null;
    this.router.navigateByUrl('/');
  }

  get isLogged(): boolean {
    return !!this.storage?.getItem('access_token');
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
    return typeof localStorage !== 'undefined' ? localStorage : null;
  }

  get currentRole(): UserRole | null {
    return this.authService.getRole();
  }

  hasAccess(minRole: UserRole): boolean {
    return hasAtLeastRole(this.currentRole, minRole);
  }

  toggleTheme(): void {
    this.applyTheme(!this.isLightTheme);
  }

  private applyTheme(light: boolean): void {
    this.isLightTheme = light;
  }

  toggleUserMenu(): void {
    this.userMenuOpen = !this.userMenuOpen;
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
}
