import { CommonModule, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InvestmentType } from '../../../investments.service';
import { AppCurrencyPipe } from '../../../shared/app-currency.pipe';
import { FinancialPrivacyService } from '../../../financial-privacy.service';
import { formatCurrencyValue } from '../../../utils/locale-utils';
import { DonutChartComponent, DonutChartItem } from '../../../shared/donut-chart/donut-chart.component';
import { KpiItem, KpiStripComponent } from '../../../shared/kpi-strip/kpi-strip.component';
import { InvestmentsOverview } from '../../investments-overview.model';

export type PatrimonyBucket = { key: string; label: string; aplicado: number; ganho: number; total: number };

@Component({
  selector: 'app-investment-overview-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, AppCurrencyPipe, DonutChartComponent, KpiStripComponent],
  templateUrl: './investment-overview-panel.component.html',
  styleUrl: './investment-overview-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InvestmentOverviewPanelComponent {
  /** Mesmo comportamento do AppCurrencyPipe: respeita "ocultar valores". */
  private readonly privacy = inject(FinancialPrivacyService);

  @Input() overview!: InvestmentsOverview;

  /**
   * Faixa unida do formato (b) — COMPONENTES.md §3.1 atribui Investimentos a ele.
   * Getter, e não `computed`, porque a entrada ainda é `@Input` clássico neste painel.
   */
  get kpiItems(): KpiItem[] {
    const o = this.overview;
    const money = (v: number) => (this.privacy.hidden() ? '••••••' : formatCurrencyValue(v));
    return [
      {
        key: 'mercado', label: 'Valor de mercado', tone: 'primary',
        value: money(o.marketValue),
        note: `${o.activeCount} posição(ões) ativa(s)`,
        tooltip: 'Valor atual de mercado das posições (usa cotação quando disponível; senão, preço médio).',
      },
      {
        key: 'investido', label: 'Total investido', tone: 'info',
        value: money(o.invested),
        note: 'Custo efetivamente aportado nas posições atuais.',
        tooltip: 'Total investido considera o custo das posições. Não inclui valorização nem proventos.',
      },
      {
        key: 'valorizacao', label: 'Valorização', tone: o.growth >= 0 ? 'success' : 'danger',
        value: money(o.growth),
        note: `Rentabilidade: ${o.profitPercent.toFixed(2)}%`,
        tooltip: 'Diferença entre o valor de mercado e o total investido. Não inclui proventos.',
      },
      {
        key: 'proventos', label: 'Proventos (12m)', tone: 'info',
        value: money(o.proventos),
        note: 'Dividendos, JCP e rendimentos nos últimos 12 meses.',
        tooltip: 'Proventos registrados nos últimos 12 meses — não entram como aporte nem valorização.',
      },
      {
        key: 'aporte', label: 'Aporte do mês', tone: o.resultMonth >= 0 ? 'success' : 'warning',
        value: money(o.aporteMonth),
        note: `Resgates: ${money(o.resgateMonth)}`,
        tooltip: 'Aportes e resgates registrados no mês corrente.',
      },
    ];
  }
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
