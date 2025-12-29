import { Component, HostBinding, OnDestroy, OnInit } from '@angular/core';
import { Router, RouterOutlet, NavigationEnd, RouterLink, RouterLinkActive } from '@angular/router';
import { NgIf } from '@angular/common';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [NgIf, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnDestroy {
  title = 'Investindo em Negócios';
  isLoginRoute = false;
  isHomeRoute = false;
  isLightTheme = false;
  @HostBinding('class.light') get lightClass(): boolean {
    return this.isLightTheme;
  }
  private sub: Subscription;

  constructor(private router: Router) {
    this.sub = this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.isLoginRoute = event.urlAfterRedirects.startsWith('/login');
        this.isHomeRoute = event.urlAfterRedirects === '/' || event.urlAfterRedirects.startsWith('/#');
      }
    });
  }

  ngOnInit(): void {
    const saved = this.storage?.getItem('theme');
    this.applyTheme(saved === 'light');
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  goToLogin(): void {
    this.router.navigateByUrl('/login');
  }

  logout(): void {
    this.storage?.removeItem('access_token');
    this.storage?.removeItem('refresh_token');
    this.storage?.removeItem('current_user');
    this.router.navigateByUrl('/');
  }

  get isLogged(): boolean {
    return !!this.storage?.getItem('access_token');
  }

  private get storage(): Storage | null {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  }

  toggleTheme(): void {
    this.applyTheme(!this.isLightTheme);
  }

  private applyTheme(light: boolean): void {
    this.isLightTheme = light;
    this.storage?.setItem('theme', light ? 'light' : 'dark');
  }
}
