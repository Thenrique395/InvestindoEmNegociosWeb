import { CommonModule, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InvestmentType } from '../../../investments.service';
import { AppCurrencyPipe } from '../../../shared/app-currency.pipe';
import { DonutChartComponent, DonutChartItem } from '../../../shared/donut-chart/donut-chart.component';
import { TransactionSummaryCardComponent } from '../../../shared/transactions/transaction-summary-card.component';
import { InvestmentsOverview } from '../../investments-overview.model';

export type PatrimonyBucket = { key: string; label: string; aplicado: number; ganho: number; total: number };

@Component({
  selector: 'app-investment-overview-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, DecimalPipe, AppCurrencyPipe, DonutChartComponent, TransactionSummaryCardComponent],
  templateUrl: './investment-overview-panel.component.html',
  styleUrl: './investment-overview-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InvestmentOverviewPanelComponent {
  @Input() overview!: InvestmentsOverview;
  @Input() patrimonioRangeMonths = 12;
  @Input() patrimonioTypeFilter: 'ALL' | InvestmentType = 'ALL';
  @Input() carteiraTypeFilter: 'ALL' | InvestmentType = 'ALL';
  @Input() tipos: { value: InvestmentType; label: string }[] = [];
  @Input() patrimonioAxisTicks: number[] = [];
  @Input() patrimonioGridColumns = 'repeat(1, minmax(0, 1fr))';
  @Input() patrimonioSeries: PatrimonyBucket[] = [];
  @Input() patrimonioChartMax = 1;
  @Input() patrimonioEstimado = false;
  @Input() carteiraDistribuicaoChart: DonutChartItem[] = [];

  @Output() patrimonioRangeMonthsChange = new EventEmitter<number>();
  @Output() patrimonioTypeFilterChange = new EventEmitter<'ALL' | InvestmentType>();
  @Output() carteiraTypeFilterChange = new EventEmitter<'ALL' | InvestmentType>();

  readonly gridLines = [1, 2, 3, 4, 5, 6];

  trackByIndex(index: number): number {
    return index;
  }
}
