import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LoansService, LoanContractRequest, LoanContractResponse, LoanSimulationResponse } from '../loans.service';
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
    private readonly cdr: ChangeDetectorRef
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
    this.loansService.list().subscribe({
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
    this.loansService.simulate(this.form).subscribe({
      next: (result) => { this.simulation = result; this.cdr.markForCheck(); },
      error: (err) => { this.error = err?.error?.detail || 'Falha ao simular empréstimo.'; this.cdr.markForCheck(); }
    });
  }

  create(): void {
    this.error = '';
    this.success = '';
    this.saving = true;
    this.loansService.create(this.form).subscribe({
      next: (contract) => {
        this.contracts = [contract, ...this.contracts];
        this.simulation = null;
        this.success = 'Empréstimo criado com cronograma calculado.';
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
}
