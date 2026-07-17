import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, OnInit, signal } from '@angular/core';
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
  // Estado de exibição assíncrono por signal (A9). form (ngModel) e sync-only
  // (editingId/expandedContractId/statusFilter/pendingDelete) ficam plain: refletem via
  // o CD disparado pelos signals co-setados no mesmo callback.
  readonly contracts = signal<LoanContractResponse[]>([]);
  readonly simulation = signal<LoanSimulationResponse | null>(null);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly deleting = signal<string | null>(null);
  readonly payingInstallment = signal<string | null>(null);
  readonly error = signal('');
  readonly success = signal('');
  editingId: string | null = null;
  expandedContractId: string | null = null;
  statusFilter: LoanStatusFilter = 'all';
  pendingDelete: LoanContractResponse | null = null;

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
    return buildLoansOverview(this.contracts());
  }

  get contractViews(): LoanContractView[] {
    return buildContractViews(this.contracts());
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
    this.loading.set(true);
    this.loansService.list().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (items) => {
        this.contracts.set(items);
        this.loading.set(false);
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.error.set(extractApiErrorMessage(err, 'Falha ao carregar empréstimos.'));
        this.loading.set(false);
        this.cdr.markForCheck();
      }
    });
  }

  simulate(): void {
    this.error.set('');
    this.success.set('');
    this.loansService.simulate(this.form).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (result) => { this.simulation.set(result); this.cdr.markForCheck(); },
      error: (err) => { this.error.set(extractApiErrorMessage(err, 'Falha ao simular empréstimo.')); this.cdr.markForCheck(); }
    });
  }

  create(): void {
    this.error.set('');
    this.success.set('');
    this.saving.set(true);

    if (this.editingId) {
      this.loansService.update(this.editingId, this.form).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: (updated) => {
          this.contracts.set(this.contracts().map(c => c.id === updated.id ? updated : c));
          this.simulation.set(null);
          this.editingId = null;
          this.resetForm();
          this.uiFeedback.success('Contrato atualizado com cronograma recalculado.');
          this.saving.set(false);
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.error.set(extractApiErrorMessage(err, 'Falha ao atualizar contrato.'));
          this.saving.set(false);
          this.cdr.markForCheck();
        }
      });
      return;
    }

    this.loansService.create(this.form).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (contract) => {
        this.contracts.set([contract, ...this.contracts()]);
        this.simulation.set(null);
        this.uiFeedback.success('Empréstimo criado com cronograma calculado.');
        this.saving.set(false);
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.error.set(extractApiErrorMessage(err, 'Falha ao criar empréstimo.'));
        this.saving.set(false);
        this.cdr.markForCheck();
      }
    });
  }

  edit(contract: LoanContractResponse): void {
    this.editingId = contract.id;
    this.simulation.set(null);
    this.error.set('');
    this.success.set('');
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
    this.simulation.set(null);
    this.error.set('');
    this.resetForm();
    this.cdr.markForCheck();
  }

  askRemove(contract: LoanContractResponse): void {
    if (this.deleting()) return;
    this.pendingDelete = contract;
    this.cdr.markForCheck();
  }

  cancelRemove(): void {
    this.pendingDelete = null;
    this.cdr.markForCheck();
  }

  confirmRemove(): void {
    const contract = this.pendingDelete;
    if (!contract || this.deleting()) return;
    this.deleting.set(contract.id);
    this.pendingDelete = null;
    this.loansService.delete(contract.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.contracts.set(this.contracts().filter(c => c.id !== contract.id));
        if (this.editingId === contract.id) { this.editingId = null; this.resetForm(); }
        if (this.expandedContractId === contract.id) { this.expandedContractId = null; }
        this.deleting.set(null);
        this.uiFeedback.success('Contrato excluído.');
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.uiFeedback.error(extractApiErrorMessage(err, 'Falha ao excluir contrato.'));
        this.deleting.set(null);
        this.cdr.markForCheck();
      }
    });
  }

  toggleInstallments(contractId: string): void {
    this.expandedContractId = this.expandedContractId === contractId ? null : contractId;
    this.cdr.markForCheck();
  }

  payInstallment(contract: LoanContractResponse, installmentId: string): void {
    if (this.payingInstallment()) return;
    this.payingInstallment.set(installmentId);
    this.loansService.payInstallment(contract.id, installmentId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (updated) => {
        this.contracts.set(this.contracts().map(c => {
          if (c.id !== contract.id) return c;
          const installments = c.installments.map(i => i.id === updated.id ? updated : i);
          const openInstallments = installments.filter(i => i.status === 'Open');
          return { ...c, installments, openInstallments: openInstallments.length, openBalance: openInstallments.reduce((s, i) => s + i.totalAmount, 0) };
        }));
        this.payingInstallment.set(null);
        this.uiFeedback.success('Parcela registrada como paga.');
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.uiFeedback.error(extractApiErrorMessage(err, 'Falha ao pagar parcela.'));
        this.payingInstallment.set(null);
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
