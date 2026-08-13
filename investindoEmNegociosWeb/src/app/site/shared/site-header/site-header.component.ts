import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SiteCtaDirective } from '../site-cta.directive';

/** Item do nav. `anchor` rola na própria página; `route` navega. */
export interface SiteNavLink {
  label: string;
  anchor?: string;
  route?: string;
}

/**
 * Cabeçalho do site público: 72px, fixo no topo, com desfoque atrás.
 *
 * Os links vêm por `@Input` porque cada página do site tem um nav diferente —
 * a landing aponta para suas âncoras, o tour do produto para as dele. Nenhuma
 * lista fica embutida aqui.
 *
 * Componente de apresentação: não injeta serviço, não sabe rota atual, e
 * comunica cliques de âncora por `@Output` para o container decidir como rolar.
 */
@Component({
  selector: 'app-site-header',
  imports: [RouterLink, SiteCtaDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './site-header.component.html',
  styleUrl: './site-header.component.scss',
})
export class SiteHeaderComponent {
  readonly brandName = input('Investindo em Negócios');
  readonly logoSrc = input('assets/logoHeaderInvestindoemNegocios.png');

  readonly links = input<readonly SiteNavLink[]>([]);

  readonly ctaLabel = input('Quero fazer parte');
  readonly ctaAnchor = input('#planos');

  readonly loginLabel = input('Entrar');
  readonly loginRoute = input('/login');

  /** Emite a âncora (`planos`) para o container rolar até ela. */
  readonly anchorSelected = output<{ anchor: string; event: Event }>();

  onAnchor(anchor: string, event: Event): void {
    this.anchorSelected.emit({ anchor, event });
  }
}
