import { CommonModule, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InvestmentType } from '../../../../core/investments.service';
import { BenchmarkKey } from '../../../../core/utils/investments.utils';
import { ChartLineComponent, LineSeries } from '../../../../shared/charts/chart-line/chart-line.component';

export type ProfitabilityPoint = {
  key: string;
  year: number;
  month: number;
  label: string;
  carteiraMes: number;
  benchmarkMes: number;
  carteiraAc: number;
  benchmarkAc: number;
};

export type ProfitabilityYearRow = {
  year: number;
  months: Array<number | null>;
  yearValue: number;
  benchmarkYearValue: number;
  acumulado: number;
  benchmarkAcumulado: number;
};

@Component({
  selector: 'app-investment-profitability-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, DecimalPipe, ChartLineComponent],
  templateUrl: './investment-profitability-panel.component.html',
  styleUrl: './investment-profitability-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InvestmentProfitabilityPanelComponent implements OnChanges {
  @Input() totalPercent = 0;
  @Input() totalBenchmarkPercent = 0;
  @Input() twelveMonthsPercent = 0;
  @Input() twelveMonthsBenchmarkPercent = 0;
  @Input() lastMonthPercent = 0;
  @Input() lastMonthBenchmarkPercent = 0;
  @Input() period: 'SINCE_START' | 'LAST_12M' = 'SINCE_START';
  @Input() benchmark: BenchmarkKey = 'CDI';
  @Input() benchmarkOptions: Array<{ key: BenchmarkKey; label: string; color: string }> = [];
  @Input() typeFilter: 'ALL' | InvestmentType = 'ALL';
  @Input() tipos: { value: InvestmentType; label: string }[] = [];
  @Input() points: ProfitabilityPoint[] = [];
  @Input() benchmarkLabel = 'Índice';
  @Input() benchmarkColor = 'var(--warning)';
  @Input() yearlyRows: ProfitabilityYearRow[] = [];

  @Output() periodChange = new EventEmitter<'SINCE_START' | 'LAST_12M'>();
  @Output() benchmarkChange = new EventEmitter<BenchmarkKey>();
  @Output() typeFilterChange = new EventEmitter<'ALL' | InvestmentType>();

  /**
   * Série da carteira + série do índice (tracejada). O desenho é do `app-chart-line`.
   *
   * Derivado em `ngOnChanges`, não em getter: estes dois alimentam os `input()` do
   * `app-chart-line`. Um getter devolveria array novo a cada ciclo de detecção, o
   * signal de entrada do gráfico veria referência nova toda vez, e todo o cálculo
   * dele (viewBox, grade, paths, ticks) refaria sem nada ter mudado.
   *
   * Enquanto os `@Input()` deste componente não virarem `input()` signal, é aqui
   * que a memoização cabe — `computed()` precisa de fonte reativa.
   */
  chartSeries: LineSeries[] = [];
  chartLabels: string[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['points'] || changes['benchmarkLabel'] || changes['benchmarkColor']) {
      this.chartSeries = this.points.length
        ? [
            {
              label: 'Sua carteira',
              color: 'var(--primary)',
              emphasis: true,
              points: this.points.map((p) => p.carteiraAc)
            },
            {
              label: this.benchmarkLabel,
              color: this.benchmarkColor,
              dashed: true,
              points: this.points.map((p) => p.benchmarkAc)
            }
          ]
        : [];
    }

    if (changes['points']) {
      this.chartLabels = this.points.map((p) => p.label);
    }
  }

  readonly formatPercent = (value: number): string => `${value.toFixed(1)}%`;

  trackByIndex(index: number): number {
    return index;
  }

  comparisonLabel(carteira: number, benchmark: number): string {
    const diff = carteira - benchmark;
    const prefix = diff >= 0 ? 'acima' : 'abaixo';
    return `${Math.abs(diff).toFixed(2)}% ${prefix} do ${this.benchmarkLabel}`;
  }

  yearBarWidth(row: ProfitabilityYearRow): number {
    const max = Math.max(...this.yearlyRows.map((item) => Math.abs(item.yearValue)), 1);
    return Math.min((Math.abs(row.yearValue) / max) * 100, 100);
  }
}
