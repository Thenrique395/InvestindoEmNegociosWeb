import { ChangeDetectionStrategy, Component, input } from '@angular/core';

type PageHeaderSize = 'sm' | 'md' | 'lg';

/**
 * Cabeçalho de tela — COMPONENTES.md §2.
 *
 * Toda tela do app usa este componente: é o que garante que título, eyebrow e
 * ações fiquem na mesma altura em todas elas. Nenhuma feature escreve `<h1>`
 * solto (ARQUITETURA_ANGULAR.md §7).
 *
 * Três slots de conteúdo:
 *   `[page-meta]`    — metadados abaixo da descrição
 *   `[page-period]`  — seletor de período ou navegação de mês
 *   `[page-actions]` — ação secundária e principal, nesta ordem
 *
 * `size` é mantido por compatibilidade com as 23 telas que já o passam, mas o
 * padrão do handoff é um só tamanho de título — as variantes só reduzem.
 */
@Component({
  selector: 'app-page-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './page-header.component.html',
  styleUrl: './page-header.component.scss',
  host: {
    '[class.page-header--elevated]': 'elevated()',
    '[attr.data-size]': 'size()',
  },
})
export class PageHeaderComponent {
  readonly eyebrow = input<string>('');
  readonly title = input.required<string>();
  readonly description = input<string>('');
  readonly size = input<PageHeaderSize>('md');
  readonly elevated = input<boolean>(false);
  readonly hasMeta = input<boolean>(true);
}
