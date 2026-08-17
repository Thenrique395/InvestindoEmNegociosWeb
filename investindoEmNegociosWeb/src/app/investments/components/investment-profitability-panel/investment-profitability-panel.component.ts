import { CommonModule, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InvestmentType } from '../../../investments.service';
import { BenchmarkKey } from '../../../utils/investments.utils';

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
  imports: [CommonModule, FormsModule, DecimalPipe],
  templateUrl: './investment-profitability-panel.component.html',
  styleUrl: './investment-profitability-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InvestmentProfitabilityPanelComponent {
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
  @Input() chartTicks: number[] = [];
  @Input() linePortfolio = '';
  @Input() lineBenchmark = '';
  @Input() points: ProfitabilityPoint[] = [];
  @Input() benchmarkLabel = 'Índice';
  @Input() benchmarkColor = 'var(--warning)';
  @Input() yearlyRows: ProfitabilityYearRow[] = [];

  @Output() periodChange = new EventEmitter<'SINCE_START' | 'LAST_12M'>();
  @Output() benchmarkChange = new EventEmitter<BenchmarkKey>();
  @Output() typeFilterChange = new EventEmitter<'ALL' | InvestmentType>();

  readonly gridLines = [1, 2, 3, 4, 5];

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
