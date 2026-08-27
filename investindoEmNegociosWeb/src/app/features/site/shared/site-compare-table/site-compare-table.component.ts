import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Célula do comparativo.
 *
 * `boolean` vira ícone (✓ / —); `string` é renderizada como texto. As duas
 * formas coexistem porque a página de planos compara resultado ("Operar o mês
 * com previsibilidade") na mesma tabela em que marca disponibilidade.
 */
export type CompareValue = boolean | string;

export interface CompareRow {
  feature: string;
  availability: readonly CompareValue[];
}

/**
 * Matriz "o que muda entre os planos".
 *
 * Tabela de verdade, não grade de divs: são dados tabulares, e o leitor de
 * tela precisa associar cada célula ao plano da coluna. O `scope` nos
 * cabeçalhos é o que faz essa associação.
 *
 * A marca de disponibilidade tem texto alternativo — um "✓" sozinho não é
 * lido, e a linha inteira viraria só o nome do recurso.
 */
@Component({
  selector: 'app-site-compare-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './site-compare-table.component.html',
  styleUrl: './site-compare-table.component.scss',
})
export class SiteCompareTableComponent {
  readonly columns = input.required<readonly string[]>();
  readonly rows = input.required<readonly CompareRow[]>();
  readonly caption = input<string | null>(null);

  /** Índice da coluna em destaque (o plano recomendado). */
  readonly highlightIndex = input<number>(-1);
}
