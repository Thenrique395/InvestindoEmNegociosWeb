import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export interface SiteStat {
  value: string;
  label: string;
  tone?: 'default' | 'income';
}

/**
 * Faixa de números do site.
 *
 * O divisor entre células é feito com `gap: 1px` sobre um fundo colorido, e
 * não com `border-right`: assim a faixa quebra em várias linhas sem deixar
 * borda solta na última célula nem faltar divisor entre as linhas.
 */
@Component({
  selector: 'app-site-stat-strip',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './site-stat-strip.component.html',
  styleUrl: './site-stat-strip.component.scss',
})
export class SiteStatStripComponent {
  readonly stats = input.required<readonly SiteStat[]>();
}
