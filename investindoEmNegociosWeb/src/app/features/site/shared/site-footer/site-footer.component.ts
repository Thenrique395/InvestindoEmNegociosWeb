import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';

export interface SiteFooterLink {
  label: string;
  anchor?: string;
  route?: string;
  href?: string;
}

export interface SiteFooterColumn {
  title: string;
  links: readonly SiteFooterLink[];
}

/**
 * Rodapé do site público.
 *
 * `full` — marca + slogan à esquerda e colunas de links à direita (landing).
 * `compact` — uma linha: marca, links soltos e copyright (tour do produto).
 */
@Component({
  selector: 'app-site-footer',
  imports: [RouterLink, NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './site-footer.component.html',
  styleUrl: './site-footer.component.scss',
  host: {
    '[class.site-footer--compact]': 'variant() === "compact"',
  },
})
export class SiteFooterComponent {
  readonly variant = input<'full' | 'compact'>('full');

  readonly brandName = input('Investindo em Negócios');
  readonly brandSlogan = input('Aprenda, invista, conquiste a liberdade financeira.');
  readonly logoSrc = input('assets/logoHeaderInvestindoemNegocios.png');

  readonly columns = input<readonly SiteFooterColumn[]>([]);
  /** Links em linha única. Usado só na variante compacta. */
  readonly inlineLinks = input<readonly SiteFooterLink[]>([]);

  readonly note = input<string | null>('Feito no Brasil');

  readonly year = computed(() => new Date().getFullYear());
}
