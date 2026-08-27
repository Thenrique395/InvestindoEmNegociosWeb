import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LoansService, LoanContractResponse, LoanInstallmentResponse, LoanPaymentRequest, LoanPaymentResult, LoanSimulationResponse } from '../../core/loans.service';
import { AccountsService, AccountResponse } from '../../core/accounts.service';
import { UiFeedbackService } from '../../core/ui-feedback.service';
import { EmptyStateComponent } from '../../shared/empty-state/empty-state.component';
import { UiStateComponent } from '../../shared/ui-state/ui-state.component';
import { ProgressBarComponent } from '../../shared/progress-bar/progress-bar.component';
import { AppCurrencyPipe } from '../../shared/app-currency.pipe';
import { PageHeaderComponent } from '../../shared/page-header/page-header.component';
import { DatePickerComponent } from '../../shared/date-picker/date-picker.component';
import { TransactionSummaryCardComponent } from '../../shared/transactions/transaction-summary-card.component';
import { SegmentedSelectorComponent, SegmentOption } from '../../shared/segmented-selector/segmented-selector.component';
import { StatusBadgeComponent } from '../../shared/status-badge/status-badge.component';
import { ConfirmSheetComponent } from '../../shared/confirm-sheet/confirm-sheet.component';
import { ResponsiveListComponent, ResponsiveListColumn } from '../../shared/responsive-list/responsive-list.component';
import { ResponsiveListCellDirective } from '../../shared/responsive-list/responsive-list-cell.directive';
import { extractApiErrorMessage } from '../../core/utils/api-error.utils';
import { LoanContractView, LoansOverview, buildContractViews, buildLoansOverview } from './loans-overview.model';
import { LoanFormModalComponent } from '../shared/loan-form-modal/loan-form-modal.component';

type LoanStatusFilter = 'all' | 'active' | 'closed' | 'archived';

@Component({
  selector: 'app-loans',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DatePickerComponent,
    RouterLink,
    EmptyStateComponent,
    UiStateComponent,
    AppCurrencyPipe,
    PageHeaderComponent,
    TransactionSummaryCardComponent,
    SegmentedSelectorComponent,
    StatusBadgeComponent,
    ProgressBarComponent,
    ConfirmSheetComponent,
    ResponsiveListComponent,
    ResponsiveListCellDirective,
    LoanFormModalComponent
  ],
  templateUrl: './loans.component.html',
  styleUrl: './loans.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoansComponent implements OnInit {
  // Estado de exibição assíncrono por signal (A9). Campos sync-only
  // (editingContract/expandedContractId/statusFilter/pendingDelete) ficam plain: refletem via
  // o CD disparado pelos signals co-setados no mesmo callback.
  readonly contracts = signal<LoanContractResponse[]>([]);
  readonly showForm = signal(false);
  readonly loading = signal(false);
  readonly deleting = signal<string | null>(null);
  readonly archiving = signal<string | null>(null);
  readonly paying = signal(false);
  readonly accounts = signal<AccountResponse[]>([]);
  readonly error = signal('');
  readonly success = signal('');
  /** Contrato em edição — `null` quando o modal está criando. Vai como [contract]. */
  editingContract: LoanContractResponse | null = null;
  expandedContractId: string | null = null;
  statusFilter: LoanStatusFilter = 'all';
  pendingDelete: LoanContractResponse | null = null;
  pendingArchive: LoanContractResponse | null = null;

  // Sheet de pagamento integrado (conta/data/multa/desconto).
  paySheet: { contract: LoanContractResponse; installment: LoanInstallmentResponse } | null = null;
  payForm = { paidAt: this.today(), accountId: '', penaltyAmount: 0, discountAmount: 0 };
  private payIdempotencyKey = '';

  readonly installmentColumns: ResponsiveListColumn[] = [
    { key: 'number', label: '#' },
    { key: 'dueDate', label: 'Vencimento' },
    { key: 'total', label: 'Total', align: 'end' },
    { key: 'balance', label: 'Saldo restante', align: 'end' },
    { key: 'status', label: 'Situação' },
    { key: 'actions', label: 'Ações', align: 'end' }
  ];
  constructor(
    private readonly loansService: LoansService,
    private readonly accountsService: AccountsService,
    private readonly uiFeedback: UiFeedbackService,
    private readonly cdr: ChangeDetectorRef,
    private readonly destroyRef: DestroyRef
  ) {}

  ngOnInit(): void {
    this.load();
    this.loadAccounts();
  }

  private loadAccounts(): void {
    this.accountsService.list().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (items) => { this.accounts.set(items); this.cdr.markForCheck(); },
      // Contas são opcionais no pagamento; falha aqui não bloqueia o fluxo.
      error: () => {}
    });
  }

  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }

  get overview(): LoansOverview {
    return buildLoansOverview(this.contracts());
  }

  get contractViews(): LoanContractView[] {
    return buildContractViews(this.contracts());
  }

  private isActive = (v: LoanContractView) => v.statusLabel === 'Ativo' || v.statusLabel === 'Atrasado';
  private isArchived = (v: LoanContractView) => v.statusLabel === 'Arquivado' || v.statusLabel === 'Cancelado';

  get filteredViews(): LoanContractView[] {
    const views = this.contractViews;
    switch (this.statusFilter) {
      case 'active': return views.filter(this.isActive);
      case 'closed': return views.filter((v) => v.statusLabel === 'Quitado');
      case 'archived': return views.filter(this.isArchived);
      default: return views.filter((v) => !this.isArchived(v));
    }
  }

  readonly trackInstallment = (installment: LoanInstallmentResponse): string => installment.id;

  get statusFilterOptions(): SegmentOption[] {
    const views = this.contractViews;
    const active = views.filter(this.isActive).length;
    const closed = views.filter((v) => v.statusLabel === 'Quitado').length;
    const archived = views.filter(this.isArchived).length;
    const options: SegmentOption[] = [
      { value: 'all', label: `Todos (${active + closed})` },
      { value: 'active', label: `Ativos (${active})` },
      { value: 'closed', label: `Quitados (${closed})` }
    ];
    if (archived > 0) options.push({ value: 'archived', label: `Arquivados (${archived})` });
    return options;
  }

  setStatusFilter(value: string): void {
    this.statusFilter = value as LoanStatusFilter;
    this.cdr.markForCheck();
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

  edit(contract: LoanContractResponse): void {
    this.editingContract = contract;
    this.showForm.set(true);
    this.cdr.markForCheck();
  }

  /** Abre o modal para um novo contrato. */
  openForm(): void {
    this.editingContract = null;
    this.showForm.set(true);
    this.cdr.markForCheck();
  }

  closeForm(): void {
    this.showForm.set(false);
    this.editingContract = null;
    this.cdr.markForCheck();
  }

  /**
   * O modal gravou. Atualiza a lista no lugar em vez de recarregar tudo — o
   * backend já devolveu o contrato com o cronograma calculado.
   */
  onContratoSalvo(contrato: LoanContractResponse): void {
    const atual = this.contracts();
    this.contracts.set(
      atual.some((c) => c.id === contrato.id)
        ? atual.map((c) => (c.id === contrato.id ? contrato : c))
        : [contrato, ...atual]
    );
    this.cdr.markForCheck();
  }

  cancelEdit(): void {
    this.closeForm();
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
        if (this.editingContract?.id === contract.id) this.closeForm();
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

  // ---- Pagamento integrado (sheet) --------------------------------------

  openPaySheet(contract: LoanContractResponse, installment: LoanInstallmentResponse): void {
    if (this.paying()) return;
    this.paySheet = { contract, installment };
    this.payForm = { paidAt: this.today(), accountId: '', penaltyAmount: 0, discountAmount: 0 };
    this.payIdempotencyKey = this.newKey();
    this.cdr.markForCheck();
  }

  cancelPaySheet(): void {
    this.paySheet = null;
    this.cdr.markForCheck();
  }

  get payTotal(): number {
    if (!this.paySheet) return 0;
    const penalty = Number(this.payForm.penaltyAmount) || 0;
    const discount = Number(this.payForm.discountAmount) || 0;
    return Math.max(this.paySheet.installment.totalAmount + penalty - discount, 0);
  }

  confirmPay(): void {
    const sheet = this.paySheet;
    if (!sheet || this.paying()) return;
    this.paying.set(true);
    const body: LoanPaymentRequest = {
      paidAt: this.payForm.paidAt,
      accountId: this.payForm.accountId || null,
      penaltyAmount: Number(this.payForm.penaltyAmount) || 0,
      discountAmount: Number(this.payForm.discountAmount) || 0
    };
    this.loansService.payInstallmentV2(sheet.contract.id, sheet.installment.id, body, this.payIdempotencyKey)
      .pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: (res) => {
          this.applyPaymentResult(res);
          this.paySheet = null;
          this.paying.set(false);
          this.uiFeedback.success('Pagamento registrado.');
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.paying.set(false);
          this.uiFeedback.error(extractApiErrorMessage(err, 'Falha ao registrar o pagamento.'));
          this.cdr.markForCheck();
        }
      });
  }

  // Backend é a fonte oficial: aplica a parcela atualizada + o resumo do contrato retornados.
  private applyPaymentResult(res: LoanPaymentResult): void {
    this.contracts.set(this.contracts().map(c => {
      if (c.id !== res.contractId) return c;
      const installments = c.installments.map(i => i.id === res.installment.id ? res.installment : i);
      return {
        ...c,
        installments,
        openBalance: res.contract.openBalance,
        openInstallments: res.contract.openInstallments,
        status: res.contract.status
      };
    }));
  }

  private newKey(): string {
    const cryptoRef = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
    return cryptoRef?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  // ---- Arquivamento (contrato com histórico não pode ser excluído) -------

  askArchive(contract: LoanContractResponse): void {
    if (this.archiving()) return;
    this.pendingArchive = contract;
    this.cdr.markForCheck();
  }

  cancelArchive(): void {
    this.pendingArchive = null;
    this.cdr.markForCheck();
  }

  confirmArchive(): void {
    const contract = this.pendingArchive;
    if (!contract || this.archiving()) return;
    this.archiving.set(contract.id);
    this.pendingArchive = null;
    this.loansService.archive(contract.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (updated) => {
        this.contracts.set(this.contracts().map(c => c.id === updated.id ? updated : c));
        this.archiving.set(null);
        this.uiFeedback.success('Contrato arquivado.');
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.uiFeedback.error(extractApiErrorMessage(err, 'Falha ao arquivar o contrato.'));
        this.archiving.set(null);
        this.cdr.markForCheck();
      }
    });
  }

}
