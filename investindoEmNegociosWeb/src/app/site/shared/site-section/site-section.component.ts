import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Fundo da faixa. O site alterna `base` e `surface` a cada seção. */
export type SiteSectionTone = 'base' | 'surface' | 'navy';

/**
 * Faixa de seção do site público.
 *
 * Concentra o ritmo vertical (`80px 56px`), a largura de leitura (`1280px`) e
 * a alternância de fundo. Nenhuma página escreve esses valores por conta
 * própria — é o que garante que as seções fiquem alinhadas entre as páginas.
 *
 * O cabeçalho (eyebrow + título + descrição) é opcional: seções que abrem com
 * layout próprio deixam os três em branco e projetam tudo no corpo.
 */
@Component({
  selector: 'app-site-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './site-section.component.html',
  styleUrl: './site-section.component.scss',
  host: {
    '[class.site-section--surface]': 'tone() === "surface"',
    '[class.site-section--navy]': 'tone() === "navy"',
    '[attr.id]': 'anchor()',
  },
})
export class SiteSectionComponent {
  readonly tone = input<SiteSectionTone>('base');

  /** Âncora para o nav do header (`recursos`, `planos`, `faq`…). */
  readonly anchor = input<string | null>(null);

  readonly eyebrow = input<string | null>(null);
  readonly title = input<string | null>(null);
  readonly description = input<string | null>(null);

  /** Centraliza o bloco de cabeçalho. Usado nas seções de FAQ e fechamento. */
  readonly centered = input(false);
}
