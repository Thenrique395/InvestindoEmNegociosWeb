import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

type FooterLink = {
  label: string;
  href: string;
};

@Component({
  selector: 'app-public-footer',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './public-footer.component.html',
  styleUrls: ['./public-footer.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PublicFooterComponent {
  readonly brandName = input.required<string>();
  readonly brandSlogan = input.required<string>();
  readonly isLightTheme = input.required<boolean>();

  readonly productLinks: FooterLink[] = [
    { label: 'Produto', href: '/#produto' },
    { label: 'Como funciona', href: '/#como-funciona' },
    { label: 'Recursos', href: '/#recursos' },
    { label: 'Segurança', href: '/#seguranca' }
  ];

  readonly accountLinks: FooterLink[] = [
    { label: 'Planos', href: '/planos' },
    { label: 'Calculadora', href: '/calculadora' },
    { label: 'Criar conta', href: '/register' },
    { label: 'Entrar', href: '/login' }
  ];

  get logoSrc(): string {
    return this.isLightTheme()
      ? '/assets/logoHeaderInvestindoemNegocios2.png'
      : '/assets/logoHeaderInvestindoemNegocios.png';
  }

  get currentYear(): number {
    return new Date().getFullYear();
  }
}
