import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { LoansService, LoanAmortizationType, LoanContractRequest, LoanContractResponse, LoanSimulationResponse } from '../loans.service';
import { UiFeedbackService } from '../ui-feedback.service';
import { EmptyStateComponent } from '../empty-state/empty-state.component';
import { UiStateComponent } from '../ui-state/ui-state.component';
import { AppCurrencyPipe } from '../shared/app-currency.pipe';
import { PageHeaderComponent } from '../shared/page-header/page-header.component';
import { TransactionSummaryCardComponent } from '../shared/transactions/transaction-summary-card.component';
import { SegmentedSelectorComponent, SegmentOption } from '../shared/segmented-selector/segmented-selector.component';
import { StatusBadgeComponent } from '../shared/status-badge/status-badge.component';
import { UsageBarComponent } from '../shared/usage-bar/usage-bar.component';
import { ConfirmSheetComponent } from '../shared/confirm-sheet/confirm-sheet.component';
import { extractApiErrorMessage } from '../utils/api-error.utils';
import { LoanContractView, LoansOverview, buildContractViews, buildLoansOverview } from './loans-overview.model';

type LoanStatusFilter = 'all' | 'active' | 'closed';

@Component({
  selector: 'app-loans',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    EmptyStateComponent,
    UiStateComponent,
    AppCurrencyPipe,
    PageHeaderComponent,
    TransactionSummaryCardComponent,
    SegmentedSelectorComponent,
    StatusBadgeComponent,
    UsageBarComponent,
    ConfirmSheetComponent
  ],
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
  payingInstallment: string | null = null;
  expandedContractId: string | null = null;
  statusFilter: LoanStatusFilter = 'all';
  pendingDelete: LoanContractResponse | null = null;
  error = '';
  success = '';

  readonly amortizationOptions: SegmentOption[] = [
    { value: 'Price', label: 'PRICE' },
    { value: 'Sac', label: 'SAC' }
  ];

  form: LoanContractRequest = this.defaultForm();

  constructor(
    private readonly loansService: LoansService,
    private readonly uiFeedback: UiFeedbackService,
    private readonly cdr: ChangeDetectorRef,
    private readonly destroyRef: DestroyRef
  ) {}

  ngOnInit(): void {
    this.load();
  }

  get overview(): LoansOverview {
    return buildLoansOverview(this.contracts);
  }

  get contractViews(): LoanContractView[] {
    return buildContractViews(this.contracts);
  }

  get filteredViews(): LoanContractView[] {
    const views = this.contractViews;
    if (this.statusFilter === 'active') return views.filter((v) => v.statusLabel === 'Ativo');
    if (this.statusFilter === 'closed') return views.filter((v) => v.statusLabel === 'Quitado');
    return views;
  }

  get statusFilterOptions(): SegmentOption[] {
    const views = this.contractViews;
    const active = views.filter((v) => v.statusLabel === 'Ativo').length;
    const closed = views.filter((v) => v.statusLabel === 'Quitado').length;
    return [
      { value: 'all', label: `Todos (${views.length})` },
      { value: 'active', label: `Ativos (${active})` },
      { value: 'closed', label: `Quitados (${closed})` }
    ];
  }

  setStatusFilter(value: string): void {
    this.statusFilter = value as LoanStatusFilter;
    this.cdr.markForCheck();
  }

  setAmortization(value: string): void {
    this.form.amortizationType = value as LoanAmortizationType;
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
        this.error = extractApiErrorMessage(err, 'Falha ao carregar empréstimos.');
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
      error: (err) => { this.error = extractApiErrorMessage(err, 'Falha ao simular empréstimo.'); this.cdr.markForCheck(); }
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
          this.error = extractApiErrorMessage(err, 'Falha ao atualizar contrato.');
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
        this.error = extractApiErrorMessage(err, 'Falha ao criar empréstimo.');
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

  askRemove(contract: LoanContractResponse): void {
    if (this.deleting) return;
    this.pendingDelete = contract;
    this.cdr.markForCheck();
  }

  cancelRemove(): void {
    this.pendingDelete = null;
    this.cdr.markForCheck();
  }

  confirmRemove(): void {
    const contract = this.pendingDelete;
    if (!contract || this.deleting) return;
    this.deleting = contract.id;
    this.pendingDelete = null;
    this.loansService.delete(contract.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.contracts = this.contracts.filter(c => c.id !== contract.id);
        if (this.editingId === contract.id) { this.editingId = null; this.resetForm(); }
        if (this.expandedContractId === contract.id) { this.expandedContractId = null; }
        this.deleting = null;
        this.uiFeedback.success('Contrato excluído.');
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.uiFeedback.error(extractApiErrorMessage(err, 'Falha ao excluir contrato.'));
        this.deleting = null;
        this.cdr.markForCheck();
      }
    });
  }

  toggleInstallments(contractId: string): void {
    this.expandedContractId = this.expandedContractId === contractId ? null : contractId;
    this.cdr.markForCheck();
  }

  payInstallment(contract: LoanContractResponse, installmentId: string): void {
    if (this.payingInstallment) return;
    this.payingInstallment = installmentId;
    this.loansService.payInstallment(contract.id, installmentId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (updated) => {
        this.contracts = this.contracts.map(c => {
          if (c.id !== contract.id) return c;
          const installments = c.installments.map(i => i.id === updated.id ? updated : i);
          const openInstallments = installments.filter(i => i.status === 'Open');
          return { ...c, installments, openInstallments: openInstallments.length, openBalance: openInstallments.reduce((s, i) => s + i.totalAmount, 0) };
        });
        this.payingInstallment = null;
        this.uiFeedback.success('Parcela registrada como paga.');
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.uiFeedback.error(extractApiErrorMessage(err, 'Falha ao pagar parcela.'));
        this.payingInstallment = null;
        this.cdr.markForCheck();
      }
    });
  }

  private resetForm(): void {
    this.form = this.defaultForm();
  }

  private defaultForm(): LoanContractRequest {
    return {
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
