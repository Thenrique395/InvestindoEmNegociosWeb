import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RevealDirective } from '../reveal.directive';

/** Card de texto do site. Definido aqui — `shared/` não importa de feature. */
export interface SiteCard {
  /** Numeração (passos) ou sigla (recursos). Ausente nos cards sem marcador. */
  badge?: string;
  title: string;
  text: string;
}

/**
 * Grade de cards de texto do site.
 *
 * Atende quatro seções da landing — passos, recursos, personas e segurança —
 * que têm a mesma anatomia: marcador opcional, título e parágrafo. Fazer uma
 * seção por componente produziria quatro cópias do mesmo SCSS.
 *
 * O `badge` muda de forma conforme o conteúdo: número nos passos, sigla nos
 * recursos, ausente nas personas.
 */
@Component({
  selector: 'app-site-card-grid',
  imports: [RevealDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './site-card-grid.component.html',
  styleUrl: './site-card-grid.component.scss',
  host: {
    '[style.--site-card-min]': 'minWidth()',
  },
})
export class SiteCardGridComponent {
  readonly cards = input.required<readonly SiteCard[]>();

  /** Largura mínima de cada card antes de quebrar a linha. */
  readonly minWidth = input('260px');

  /** Cascata da revelação: cada card entra 120ms depois do anterior. */
  readonly stagger = input(true);

  delayFor(index: number): number {
    return this.stagger() ? Math.min(index, 3) * 120 : 0;
  }
}
