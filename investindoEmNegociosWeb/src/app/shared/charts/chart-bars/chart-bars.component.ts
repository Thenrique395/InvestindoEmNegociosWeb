import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export interface ChartSeries {
  label: string;
  /** Token, não hex: `var(--income)`. */
  color: string;
  points: number[];
}

/**
 * Gráfico de barras — COMPONENTES.md §9.
 *
 * **Nenhuma feature desenha barra à mão.** Reimplementar reintroduz a armadilha
 * da altura percentual, que é o erro nº 5 da lista dos cinco que mais custam
 * (ARQUITETURA_ANGULAR.md §13):
 *
 * - se a altura em % resolver contra a coluna inteira, a barra de valor máximo
 *   transborda por cima do rótulo;
 * - se a coluna não tiver altura definida, a percentagem não resolve e todas as
 *   barras achatam no `min-height`.
 *
 * A solução é a barra ter a **própria pista** `flex:1; min-height:0` dentro de
 * uma coluna de altura fixa. Está no SCSS, e é por isso que este componente
 * existe.
 */
@Component({
  selector: 'app-chart-bars',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './chart-bars.component.html',
  styleUrl: './chart-bars.component.scss',
})
export class ChartBarsComponent {
  readonly series = input.required<readonly ChartSeries[]>();
  readonly labels = input.required<readonly string[]>();
  readonly height = input(190);
  /** Formata o valor no `title` de cada barra. */
  readonly format = input<(value: number) => string>((v) => String(v));
  readonly showLegend = input(true);

  /** Maior valor entre todas as séries — a escala é compartilhada. */
  private readonly maxValue = computed(() => {
    const all = this.series().flatMap((s) => s.points);
    const max = Math.max(...all, 0);
    return max > 0 ? max : 1;
  });

  /** Percentual de altura de cada barra, já normalizado pela escala. */
  percentOf(value: number): number {
    return (value / this.maxValue()) * 100;
  }

  titleFor(series: ChartSeries, index: number): string {
    return `${series.label} · ${this.labels()[index]}: ${this.format()(series.points[index])}`;
  }
}
