import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { CenariosService, ScenarioSimulationResponse } from '../cenarios.service';
import { AppCurrencyPipe } from '../shared/app-currency.pipe';
import { UiStateComponent } from '../ui-state/ui-state.component';
import { PageHeaderComponent } from '../shared/page-header/page-header.component';
import { TransactionSummaryCardComponent } from '../shared/transactions/transaction-summary-card.component';
import { SegmentedSelectorComponent, SegmentOption } from '../shared/segmented-selector/segmented-selector.component';
import { ComparisonPillComponent } from '../shared/comparison-pill/comparison-pill.component';
import { extractApiErrorMessage } from '../utils/api-error.utils';
import { ScenarioPointView, buildScenarioPointViews, impactSign, impactTone } from './scenario-overview.model';

@Component({
  selector: 'app-cenarios',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AppCurrencyPipe,
    UiStateComponent,
    PageHeaderComponent,
    TransactionSummaryCardComponent,
    SegmentedSelectorComponent,
    ComparisonPillComponent
  ],
  templateUrl: './cenarios.component.html',
  styleUrl: './cenarios.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CenariosComponent {
  // Estado por signal (A9): result/loading/error vêm de callback assíncrono (HTTP fora da zona).
  readonly result = signal<ScenarioSimulationResponse | null>(null);
  readonly loading = signal(false);
  readonly error = signal('');

  readonly periodOptions: SegmentOption[] = [
    { value: 'month', label: 'Este mês' },
    { value: 'quarter', label: '3 meses' },
    { value: 'semester', label: '6 meses' },
    { value: 'year', label: '12 meses' }
  ];

  params = {
    period: 'month',
    extraMonthlyIncome: 0,
    extraMonthlyExpense: 0,
    savingsRatePercent: 0
  };

  constructor(
    private readonly cenariosService: CenariosService,
    private readonly cdr: ChangeDetectorRef,
    private readonly destroyRef: DestroyRef
  ) {}

  setPeriod(value: string): void {
    this.params.period = value;
  }

  simulate(): void {
    this.loading.set(true);
    this.error.set('');
    this.cenariosService.simulate({ ...this.params, referenceDate: null })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (r) => { this.result.set(r); this.loading.set(false); this.cdr.markForCheck(); },
        error: (err) => { this.error.set(extractApiErrorMessage(err, 'Falha ao simular cenário.')); this.loading.set(false); this.cdr.markForCheck(); }
      });
  }

  get impactSign(): string {
    const r = this.result();
    return r ? impactSign(r.impactAmount) : '';
  }

  get impactTrend(): 'up' | 'down' | 'flat' {
    const r = this.result();
    if (!r) return 'flat';
    const tone = impactTone(r.impactAmount);
    return tone === 'positive' ? 'up' : tone === 'negative' ? 'down' : 'flat';
  }

  get scenarioTone(): 'success' | 'danger' | 'info' {
    const r = this.result();
    if (!r) return 'info';
    const tone = impactTone(r.impactAmount);
    return tone === 'positive' ? 'success' : tone === 'negative' ? 'danger' : 'info';
  }

  get pointViews(): ScenarioPointView[] {
    return buildScenarioPointViews(this.result()?.scenarioPoints);
  }
}
