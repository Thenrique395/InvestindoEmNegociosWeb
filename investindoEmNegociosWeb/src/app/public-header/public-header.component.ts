import { Component, ElementRef, HostListener, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

export type PublicSectionRequest = {
  sectionId: string;
  event: Event;
};

type PublicNavItem = {
  label: string;
  href: string;
  sectionId?: string;
};

@Component({
  selector: 'app-public-header',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './public-header.component.html',
  styleUrls: ['./public-header.component.scss']
})
export class PublicHeaderComponent {
  readonly brandName = input.required<string>();
  readonly isLightTheme = input.required<boolean>();

  readonly brandReload = output<Event>();
  readonly publicHome = output<Event>();
  readonly sectionRequested = output<PublicSectionRequest>();
  readonly loginRequested = output<void>();

  readonly navItems: PublicNavItem[] = [
    { label: 'Início', href: '/' },
    { label: 'Produto', href: '/#produto', sectionId: 'produto' },
    { label: 'Como funciona', href: '/#como-funciona', sectionId: 'como-funciona' },
    { label: 'Planos', href: '/#planos', sectionId: 'planos' },
    { label: 'FAQ', href: '/#faq', sectionId: 'faq' }
  ];

  readonly mobileMenuOpen = signal(false);

  constructor(private readonly hostRef: ElementRef<HTMLElement>) {}

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.mobileMenuOpen()) return;

    const target = event.target as Element | null;
    if (target && !this.hostRef.nativeElement.contains(target)) {
      this.mobileMenuOpen.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    this.mobileMenuOpen.set(false);
  }

  get logoSrc(): string {
    return this.isLightTheme()
      ? '/assets/logoHeaderInvestindoemNegocios2.png'
      : '/assets/logoHeaderInvestindoemNegocios.png';
  }

  handleNavClick(item: PublicNavItem, event: Event): void {
    this.mobileMenuOpen.set(false);

    if (item.sectionId) {
      this.sectionRequested.emit({ sectionId: item.sectionId, event });
      return;
    }

    this.publicHome.emit(event);
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen.update((open) => !open);
  }

  handleMobileLogin(): void {
    this.mobileMenuOpen.set(false);
    this.loginRequested.emit();
  }
}
