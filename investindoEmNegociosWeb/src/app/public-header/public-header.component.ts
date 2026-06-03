import { Component, input, output } from '@angular/core';
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

  get logoSrc(): string {
    return this.isLightTheme()
      ? '/assets/logoHeaderInvestindoemNegocios2.png'
      : '/assets/logoHeaderInvestindoemNegocios.png';
  }

  handleNavClick(item: PublicNavItem, event: Event): void {
    if (item.sectionId) {
      this.sectionRequested.emit({ sectionId: item.sectionId, event });
      return;
    }

    this.publicHome.emit(event);
  }
}
