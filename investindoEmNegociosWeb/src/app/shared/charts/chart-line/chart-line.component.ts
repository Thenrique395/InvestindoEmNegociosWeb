import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';

export interface LineSeries {
  label: string;
  /** Token, não hex. */
  color: string;
  points: number[];
  /** Série de comparação (aporte, benchmark, planejado): traço fino tracejado. */
  dashed?: boolean;
  /** Traço mais grosso: a série principal do gráfico, quando há uma. */
  emphasis?: boolean;
  /**
   * Escala em que a série é desenhada. `secondary` ganha faixa e escala
   * próprias no topo — é o que permite pôr patrimônio (centenas de milhares)
   * no mesmo card que fluxo mensal (dezenas de milhares) sem achatar um deles.
   */
  axis?: 'primary' | 'secondary';
}

export interface ChartTick {
  /** Distância do topo da área de plotagem, em porcentagem. */
  pct: number;
  label: string;
}

export interface ChartPointHit {
  cx: number;
  cy: number;
  title: string;
}

/** O host formata: `shared/` não sabe o que é moeda nem qual o locale ativo. */
export type ChartValueFormatter = (value: number) => string;

/**
 * Gráfico de linha — COMPONENTES.md §9.
 *
 * Nenhuma feature escreve SVG (ARQUITETURA_ANGULAR.md §8). Padrão único:
 * 3 linhas de grade horizontais, série de 2.4px com ponta arredondada, área
 * sob a linha em gradiente .18 → 0, e comparação em 2px tracejado 5 5.
 *
 * **A escala é uniforme, não esticada.** O `viewBox` tem largura fixa e o SVG
 * escala proporcionalmente (`height: auto`): com `preserveAspectRatio="none"`
 * os marcadores de ponto viravam elipses em card largo, e a marca do último
 * ponto é parte do desenho no protótipo.
 *
 * **Os rótulos de eixo são HTML, não `<text>` do SVG.** Dentro do SVG eles
 * escalariam junto com o desenho e mudariam de tamanho conforme a largura do
 * card; sobrepostos em HTML, ficam no tamanho do sistema de tipografia.
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
  /** Altura do `viewBox`. Com a largura fixa de 820, é o que define a proporção. */
  readonly height = input(190);
  readonly showArea = input(true);
  readonly showLegend = input(true);
  /** Marca o último ponto de cada série com um círculo, como no protótipo. */
  readonly markLast = input(false);
  /** Destaca o último rótulo do eixo x — o mês corrente. */
  readonly highlightLastLabel = input(false);
  /** Legenda vira botão: clicar esconde a série. */
  readonly toggleable = input(false);
  /** Linha de contexto acima do eixo x ("Fluxo mensal · R$ 6 a 21 mil"). */
  readonly axisNote = input('');
  /** Sem formatador não há tick de valor nem tooltip de ponto — só o desenho. */
  readonly formatValue = input<ChartValueFormatter | null>(null);
  /**
   * Formato dos rótulos de eixo. Costuma ser a forma curta ("R$ 220 mil"): o
   * valor por extenso repetido na lateral come a largura do desenho. Sem ele,
   * cai no `formatValue`.
   */
  readonly formatTick = input<ChartValueFormatter | null>(null);
  /**
   * Fatia do topo (0 a 1) reservada às séries de eixo secundário. Em 0 todas as
   * séries dividem uma escala só. O protótipo usa .52 no card de patrimônio.
   */
  readonly secondaryBand = input(0);

  private readonly hidden = signal<ReadonlySet<string>>(new Set());

  /** Coordenadas internas. A escala real é do CSS. */
  private readonly viewW = 820;
  readonly viewBox = computed(() => `0 0 ${this.viewW} ${this.height()}`);

  /** 3 linhas de grade, como manda a spec. */
  readonly gridLines = computed(() => {
    const base = this.hasSecondary() ? this.secondaryBottom() : this.height();
    return [0.25, 0.5, 0.75].map((r) => r * base);
  });

  /** Só o que está visível entra no desenho — e também no cálculo da escala. */
  readonly visibleSeries = computed(() => this.series().filter((s) => !this.hidden().has(s.label)));

  readonly visibleSeriesLabels = computed(() => this.visibleSeries().map((s) => s.label).join(', '));

  isHidden(s: LineSeries): boolean {
    return this.hidden().has(s.label);
  }

  toggle(s: LineSeries): void {
    if (!this.toggleable()) {
      return;
    }
    const next = new Set(this.hidden());
    if (next.has(s.label)) {
      next.delete(s.label);
    } else {
      // Esconder a última série visível deixaria o card em branco sem explicar
      // por quê; a interação simplesmente não acontece.
      if (this.visibleSeries().length <= 1) {
        return;
      }
      next.add(s.label);
    }
    this.hidden.set(next);
  }

  /** Há faixa separada de fato? Só quando pedida E com série que a use. */
  readonly hasSecondary = computed(
    () => this.secondaryBand() > 0 && this.visibleSeries().some((s) => s.axis === 'secondary'),
  );

  private boundsFor(axis: 'primary' | 'secondary') {
    const all = this.visibleSeries()
      .filter((s) => (s.axis === 'secondary') === (axis === 'secondary'))
      .flatMap((s) => s.points);
    if (!all.length) {
      return { min: 0, max: 1 };
    }
    // O piso é 0 no fluxo (a leitura é "quanto entrou"), mas no eixo secundário
    // é o próprio mínimo: patrimônio ancorado em zero vira uma linha reta.
    const min = axis === 'secondary' ? Math.min(...all) : Math.min(...all, 0);
    const max = Math.max(...all, min);
    return { min, max: max === min ? min + 1 : max };
  }

  /** Topo da faixa primária: abaixo da secundária, com uma folga de respiro. */
  private primaryTop(): number {
    return this.hasSecondary() ? this.height() * (this.secondaryBand() + 0.08) : 0;
  }

  private secondaryBottom(): number {
    return this.height() * this.secondaryBand();
  }

  readonly ticks = computed<ChartTick[]>(() => {
    const format = this.formatTick() ?? this.formatValue();
    if (!format) {
      return [];
    }
    // Com duas faixas, os ticks descrevem a de cima: a de baixo é o fluxo, e
    // quem a explica é o `axisNote`. Seis números na lateral seriam ilegíveis.
    const eixo = this.hasSecondary() ? 'secondary' : 'primary';
    const topo = this.hasSecondary() ? 0 : 0;
    const base = this.hasSecondary() ? this.secondaryBottom() : this.height();
    const { min, max } = this.boundsFor(eixo);
    // Topo, meio e base: mais que isso vira grade de planilha sobre um card.
    return [1, 0.5, 0].map((r) => ({
      pct: ((topo + (1 - r) * (base - topo)) / this.height()) * 100,
      label: format(min + (max - min) * r),
    }));
  });

  readonly pointHits = computed<ChartPointHit[]>(() => {
    const format = this.formatValue();
    const labels = this.labels();
    if (!format) {
      return [];
    }
    return this.visibleSeries().flatMap((s) =>
      s.points.map((value, i) => {
        const [cx, cy] = this.xy(i, value, s.points.length, s.axis);
        return { cx, cy, title: `${labels[i] ?? ''} — ${s.label}: ${format(value)}`.trim() };
      }),
    );
  });

  private xy(index: number, value: number, total: number, axis?: 'primary' | 'secondary'): [number, number] {
    const secundaria = axis === 'secondary' && this.hasSecondary();
    const { min, max } = this.boundsFor(secundaria ? 'secondary' : 'primary');
    const topo = secundaria ? 0 : this.primaryTop();
    const base = secundaria ? this.secondaryBottom() : this.height();
    const x = total <= 1 ? 0 : (index / (total - 1)) * this.viewW;
    const y = base - ((value - min) / (max - min)) * (base - topo);
    return [x, y];
  }

  pathFor(s: LineSeries): string {
    const total = s.points.length;
    if (!total) return '';
    return s.points
      .map((v, i) => {
        const [x, y] = this.xy(i, v, total, s.axis);
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');
  }

  /** Mesma linha, fechada até a base — é o que recebe o gradiente. */
  areaFor(s: LineSeries): string {
    const path = this.pathFor(s);
    if (!path) return '';
    const base = s.axis === 'secondary' && this.hasSecondary() ? this.secondaryBottom() : this.height();
    return `${path} L${this.viewW} ${base} L0 ${base} Z`;
  }

  lastPoint(s: LineSeries): { cx: number; cy: number } | null {
    const total = s.points.length;
    if (!total) return null;
    const [cx, cy] = this.xy(total - 1, s.points[total - 1], total, s.axis);
    return { cx, cy };
  }

  gradientId(index: number): string {
    return `chart-line-fill-${index}`;
  }
}
