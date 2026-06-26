import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { CenariosService, ScenarioSimulationResponse } from '../cenarios.service';
import { AppCurrencyPipe } from '../shared/app-currency.pipe';
import { UiStateComponent } from '../ui-state/ui-state.component';
import { extractApiErrorMessage } from '../utils/api-error.utils';

@Component({
  selector: 'app-cenarios',
  standalone: true,
  imports: [CommonModule, FormsModule, AppCurrencyPipe, UiStateComponent],
  templateUrl: './cenarios.component.html',
  styleUrl: './cenarios.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CenariosComponent {
  result: ScenarioSimulationResponse | null = null;
  loading = false;
  error = '';

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

  simulate(): void {
    this.loading = true;
    this.error = '';
    this.cenariosService.simulate({ ...this.params, referenceDate: null })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (r) => { this.result = r; this.loading = false; this.cdr.markForCheck(); },
        error: (err) => { this.error = extractApiErrorMessage(err, 'Falha ao simular cenário.'); this.loading = false; this.cdr.markForCheck(); }
      });
  }

  get impactSign(): string {
    if (!this.result) return '';
    return this.result.impactAmount >= 0 ? '+' : '';
  }
}
