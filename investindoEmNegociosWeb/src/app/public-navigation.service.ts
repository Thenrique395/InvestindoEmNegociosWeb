import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class PublicNavigationService {
  private readonly router = inject(Router);

  goToPublicHome(currentPath: string, isBrowser: boolean, event?: Event): void {
    event?.preventDefault();

    if (currentPath === '/') {
      this.scrollToPublicTop(isBrowser);
      return;
    }

    this.router.navigateByUrl('/').then(() => this.scrollToPublicTop(isBrowser));
  }

  scrollToPublicSection(sectionId: string, currentPath: string, isBrowser: boolean, event?: Event): void {
    event?.preventDefault();
    const scroll = () => this.scrollToElement(sectionId, isBrowser);

    if (currentPath === '/') {
      scroll();
      return;
    }

    this.router.navigate(['/']).then(() => {
      if (!isBrowser || typeof window === 'undefined') return;
      window.setTimeout(scroll, 0);
    });
  }

  scrollToElement(sectionId: string, isBrowser: boolean): void {
    if (!isBrowser || typeof document === 'undefined' || typeof window === 'undefined') return;

    const target = document.getElementById(sectionId);
    if (!target) return;

    const headerOffset = 72;
    const top = target.getBoundingClientRect().top + window.scrollY - headerOffset;
    window.history.pushState(null, '', `/#${sectionId}`);
    window.scrollTo({ top: Math.max(top, 0), behavior: 'smooth' });
  }

  scrollToPublicTop(isBrowser: boolean): void {
    if (!isBrowser || typeof window === 'undefined') return;

    window.history.replaceState(null, '', '/');
    window.scrollTo({ top: 0, behavior: 'auto' });
    window.setTimeout(() => window.scrollTo({ top: 0, behavior: 'auto' }), 80);
    window.setTimeout(() => window.scrollTo({ top: 0, behavior: 'auto' }), 250);
  }
}
