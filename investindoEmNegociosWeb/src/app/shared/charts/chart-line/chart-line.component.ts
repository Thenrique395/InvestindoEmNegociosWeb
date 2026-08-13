import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export interface LineSeries {
  label: string;
  /** Token, não hex. */
  color: string;
  points: number[];
  /** Série de comparação (aporte, benchmark, planejado): traço fino tracejado. */
  dashed?: boolean;
}

/**
 * Gráfico de linha — COMPONENTES.md §9.
 *
 * Nenhuma feature escreve SVG (ARQUITETURA_ANGULAR.md §8). Padrão único:
 * 3 linhas de grade horizontais, série de 2.4px com ponta arredondada, área
 * sob a linha em gradiente .18 → 0, e comparação em 2px tracejado 5 5.
 *
 * O `viewBox` é fixo e o SVG escala por CSS: assim a mesma série serve a
 * qualquer largura de card sem recalcular pontos.
 */
@Component({
  selector: 'app-chart-line',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './chart-line.component.html',
  styleUrl: './chart-line.component.scss',
})
export class ChartLineComponent {
  readonly series = input.required<readonly LineSeries[]>();
  readonly labels = input<readonly string[]>([]);
  readonly height = input(190);
  readonly showArea = input(true);
  readonly showLegend = input(true);

  /** Coordenadas internas. A escala real é do CSS. */
  private readonly viewW = 600;
  private readonly viewH = 200;
  readonly viewBox = `0 0 ${this.viewW} ${this.viewH}`;

  /** 3 linhas de grade, como manda a spec. */
  readonly gridLines = [0.25, 0.5, 0.75].map((r) => r * this.viewH);

  private readonly bounds = computed(() => {
    const all = this.series().flatMap((s) => s.points);
    if (!all.length) return { min: 0, max: 1 };
    const min = Math.min(...all, 0);
    const max = Math.max(...all, 0);
    return { min, max: max === min ? min + 1 : max };
  });

  private xy(index: number, value: number, total: number): [number, number] {
    const { min, max } = this.bounds();
    const x = total <= 1 ? 0 : (index / (total - 1)) * this.viewW;
    const y = this.viewH - ((value - min) / (max - min)) * this.viewH;
    return [x, y];
  }

  pathFor(s: LineSeries): string {
    const total = s.points.length;
    if (!total) return '';
    return s.points
      .map((v, i) => {
        const [x, y] = this.xy(i, v, total);
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');
  }

  /** Mesma linha, fechada até a base — é o que recebe o gradiente. */
  areaFor(s: LineSeries): string {
    const path = this.pathFor(s);
    if (!path) return '';
    return `${path} L${this.viewW} ${this.viewH} L0 ${this.viewH} Z`;
  }

  gradientId(index: number): string {
    return `chart-line-fill-${index}`;
  }
}
