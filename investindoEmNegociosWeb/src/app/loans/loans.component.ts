import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { LoansService, LoanContractRequest, LoanContractResponse, LoanSimulationResponse } from '../loans.service';
import { UiFeedbackService } from '../ui-feedback.service';
import { EmptyStateComponent } from '../empty-state/empty-state.component';
import { UiStateComponent } from '../ui-state/ui-state.component';
import { AppCurrencyPipe } from '../shared/app-currency.pipe';
import { StatCardComponent } from '../shared/stat-card/stat-card.component';
import { PeriodHeroComponent } from '../shared/period-hero/period-hero.component';
import { PeriodActionCardComponent } from '../shared/period-action-card/period-action-card.component';

@Component({
  selector: 'app-loans',
  standalone: true,
  imports: [CommonModule, FormsModule, EmptyStateComponent, UiStateComponent, AppCurrencyPipe, StatCardComponent, PeriodHeroComponent, PeriodActionCardComponent],
  templateUrl: './loans.component.html',
  styleUrl: './loans.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoansComponent implements OnInit {
  contracts: LoanContractResponse[] = [];
  simulation: LoanSimulationResponse | null = null;
  loading = false;
  saving = false;
  deleting: string | null = null;
  editingId: string | null = null;
  error = '';
  success = '';

  form: LoanContractRequest = {
    title: 'Empréstimo pessoal',
    principalAmount: 10000,
    annualInterestRate: 18,
    termMonths: 24,
    amortizationType: 'Price',
    startDate: new Date().toISOString().slice(0, 10),
    paymentDay: 10
  };

  constructor(
    private readonly loansService: LoansService,
    private readonly uiFeedback: UiFeedbackService,
    private readonly cdr: ChangeDetectorRef,
    private readonly destroyRef: DestroyRef
  ) {}

  ngOnInit(): void {
    this.load();
  }

  get totalOpenBalance(): number {
    return this.contracts.reduce((total, contract) => total + Number(contract.openBalance || 0), 0);
  }

  get totalMonthlyPayment(): number {
    return this.contracts.reduce((total, contract) => total + Number(contract.monthlyPayment || 0), 0);
  }

  get totalOpenInstallments(): number {
    return this.contracts.reduce((total, contract) => total + Number(contract.openInstallments || 0), 0);
  }

  load(): void {
    this.loading = true;
    this.loansService.list().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (items) => {
        this.contracts = items;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.error = err?.error?.detail || 'Falha ao carregar empréstimos.';
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  simulate(): void {
    this.error = '';
    this.success = '';
    this.loansService.simulate(this.form).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (result) => { this.simulation = result; this.cdr.markForCheck(); },
      error: (err) => { this.error = err?.error?.detail || 'Falha ao simular empréstimo.'; this.cdr.markForCheck(); }
    });
  }

  create(): void {
    this.error = '';
    this.success = '';
    this.saving = true;

    if (this.editingId) {
      this.loansService.update(this.editingId, this.form).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: (updated) => {
          this.contracts = this.contracts.map(c => c.id === updated.id ? updated : c);
          this.simulation = null;
          this.editingId = null;
          this.resetForm();
          this.uiFeedback.success('Contrato atualizado com cronograma recalculado.');
          this.saving = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.error = err?.error?.detail || 'Falha ao atualizar contrato.';
          this.saving = false;
          this.cdr.markForCheck();
        }
      });
      return;
    }

    this.loansService.create(this.form).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (contract) => {
        this.contracts = [contract, ...this.contracts];
        this.simulation = null;
        this.uiFeedback.success('Empréstimo criado com cronograma calculado.');
        this.saving = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.error = err?.error?.detail || 'Falha ao criar empréstimo.';
        this.saving = false;
        this.cdr.markForCheck();
      }
    });
  }

  edit(contract: LoanContractResponse): void {
    this.editingId = contract.id;
    this.simulation = null;
    this.error = '';
    this.success = '';
    this.form = {
      title: contract.title,
      principalAmount: contract.principalAmount,
      annualInterestRate: contract.annualInterestRate,
      termMonths: contract.termMonths,
      amortizationType: contract.amortizationType,
      startDate: contract.startDate,
      paymentDay: contract.paymentDay
    };
    this.cdr.markForCheck();
  }

  cancelEdit(): void {
    this.editingId = null;
    this.simulation = null;
    this.error = '';
    this.resetForm();
    this.cdr.markForCheck();
  }

  remove(contract: LoanContractResponse): void {
    if (this.deleting) return;
    this.deleting = contract.id;
    this.loansService.delete(contract.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.contracts = this.contracts.filter(c => c.id !== contract.id);
        if (this.editingId === contract.id) { this.editingId = null; this.resetForm(); }
        this.deleting = null;
        this.uiFeedback.success('Contrato excluído.');
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.uiFeedback.error(err?.error?.detail || 'Falha ao excluir contrato.');
        this.deleting = null;
        this.cdr.markForCheck();
      }
    });
  }

  private resetForm(): void {
    this.form = {
      title: 'Empréstimo pessoal',
      principalAmount: 10000,
      annualInterestRate: 18,
      termMonths: 24,
      amortizationType: 'Price',
      startDate: new Date().toISOString().slice(0, 10),
      paymentDay: 10
    };
  }
}
