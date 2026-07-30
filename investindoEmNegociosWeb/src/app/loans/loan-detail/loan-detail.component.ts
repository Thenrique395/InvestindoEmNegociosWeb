import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import {
  LoansService, LoanContractResponse, LoanInstallmentResponse,
  LoanPaymentHistoryItem, LoanPaymentRequest, LoanPaymentResult,
  LoanAmortizationStrategy, LoanAmortizationSimulationResult, LoanTimelineEvent
} from '../../loans.service';
import { AccountsService, AccountResponse } from '../../accounts.service';
import { UiFeedbackService } from '../../ui-feedback.service';
import { AppCurrencyPipe } from '../../shared/app-currency.pipe';
import { PageHeaderComponent } from '../../shared/page-header/page-header.component';
import { TransactionSummaryCardComponent } from '../../shared/transactions/transaction-summary-card.component';
import { SegmentedSelectorComponent, SegmentOption } from '../../shared/segmented-selector/segmented-selector.component';
import { StatusBadgeComponent } from '../../shared/status-badge/status-badge.component';
import { ConfirmSheetComponent } from '../../shared/confirm-sheet/confirm-sheet.component';
import { UiStateComponent } from '../../ui-state/ui-state.component';
import { EmptyStateComponent } from '../../empty-state/empty-state.component';
import { extractApiErrorMessage } from '../../utils/api-error.utils';
import { LoanContractView, buildContractView } from '../loans-overview.model';

type LoanDetailTab = 'resumo' | 'parcelas' | 'evolucao' | 'historico';

@Component({
  selector: 'app-loan-detail',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterModule, AppCurrencyPipe, PageHeaderComponent,
    TransactionSummaryCardComponent, SegmentedSelectorComponent, StatusBadgeComponent,
    ConfirmSheetComponent, UiStateComponent, EmptyStateComponent
  ],
  templateUrl: './loan-detail.component.html',
  styleUrl: './loan-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoanDetailComponent implements OnInit {
  readonly contract = signal<LoanContractResponse | null>(null);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly accounts = signal<AccountResponse[]>([]);
  readonly paying = signal(false);
  readonly reversing = signal<string | null>(null);
  readonly loadingPayments = signal<string | null>(null);

  activeTab: LoanDetailTab = 'resumo';
  readonly tabs: SegmentOption[] = [
    { value: 'resumo', label: 'Resumo' },
    { value: 'parcelas', label: 'Parcelas' },
    { value: 'evolucao', label: 'Evolução' },
    { value: 'historico', label: 'Histórico' }
  ];

  readonly timeline = signal<LoanTimelineEvent[] | null>(null);
  readonly loadingTimeline = signal(false);

  // Histórico de pagamentos por parcela (carregado sob demanda).
  expandedInstallmentId: string | null = null;
  paymentsByInstallment: Record<string, LoanPaymentHistoryItem[]> = {};

  // Sheet de pagamento.
  paySheet: { installment: LoanInstallmentResponse } | null = null;
  payForm = { paidAt: this.today(), accountId: '', penaltyAmount: 0, discountAmount: 0 };
  private payIdempotencyKey = '';

  // Sheet de amortização.
  readonly amortizing = signal(false);
  readonly amortPreview = signal<LoanAmortizationSimulationResult | null>(null);
  amortSheetOpen = false;
  amortForm = { amount: 0, strategy: 'ReduceTerm' as LoanAmortizationStrategy, accountId: '' };
  readonly amortStrategies: SegmentOption[] = [
    { value: 'ReduceTerm', label: 'Reduzir prazo' },
    { value: 'ReducePayment', label: 'Reduzir parcela' },
    { value: 'FullSettlement', label: 'Quitar' }
  ];
  private amortIdempotencyKey = '';

  private contractId = '';

  constructor(
    private readonly route: ActivatedRoute,
    private readonly loansService: LoansService,
    private readonly accountsService: AccountsService,
    private readonly uiFeedback: UiFeedbackService,
    private readonly cdr: ChangeDetectorRef,
    private readonly destroyRef: DestroyRef
  ) {}

  ngOnInit(): void {
    this.contractId = this.route.snapshot.paramMap.get('id') ?? '';
    this.load();
    this.accountsService.list().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (items) => { this.accounts.set(items); this.cdr.markForCheck(); },
      error: () => {}
    });
  }

  get view(): LoanContractView | null {
    const c = this.contract();
    return c ? buildContractView(c) : null;
  }

  load(): void {
    if (!this.contractId) return;
    this.loading.set(true);
    this.error.set('');
    this.loansService.get(this.contractId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (c) => { this.contract.set(c); this.loading.set(false); this.cdr.markForCheck(); },
      error: (err) => {
        this.error.set(extractApiErrorMessage(err, 'Não foi possível carregar o contrato.'));
        this.loading.set(false);
        this.cdr.markForCheck();
      }
    });
  }

  setTab(value: string): void {
    this.activeTab = value as LoanDetailTab;
    if (this.activeTab === 'historico' && !this.timeline() && !this.loadingTimeline()) this.loadTimeline();
    this.cdr.markForCheck();
  }

  private loadTimeline(): void {
    this.loadingTimeline.set(true);
    this.loansService.timeline(this.contractId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (events) => { this.timeline.set(events); this.loadingTimeline.set(false); this.cdr.markForCheck(); },
      error: () => { this.loadingTimeline.set(false); this.cdr.markForCheck(); }
    });
  }

  /** Pontos do gráfico de saldo devedor (endingBalance por parcela), normalizados em viewBox 100×40. */
  get balanceChart(): { line: string; area: string } | null {
    const c = this.contract();
    if (!c || !c.installments.length) return null;
    const inst = [...c.installments].sort((a, b) => a.installmentNo - b.installmentNo);
    const width = 100;
    const height = 40;
    const max = Math.max(c.principalAmount, ...inst.map(i => i.endingBalance), 1);
    const n = inst.length;
    const pts = inst.map((i, idx) => {
      const x = n > 1 ? (idx / (n - 1)) * width : 0;
      const y = height - (i.endingBalance / max) * height;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    });
    const line = pts.join(' ');
    return { line, area: `0,${height} ${line} ${width},${height}` };
  }

  // ---- Pagamento --------------------------------------------------------

  openPaySheet(installment: LoanInstallmentResponse): void {
    if (this.paying()) return;
    this.paySheet = { installment };
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
    const c = this.contract();
    if (!sheet || !c || this.paying()) return;
    this.paying.set(true);
    const body: LoanPaymentRequest = {
      paidAt: this.payForm.paidAt,
      accountId: this.payForm.accountId || null,
      penaltyAmount: Number(this.payForm.penaltyAmount) || 0,
      discountAmount: Number(this.payForm.discountAmount) || 0
    };
    this.loansService.payInstallmentV2(c.id, sheet.installment.id, body, this.payIdempotencyKey)
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

  private applyPaymentResult(res: LoanPaymentResult): void {
    const c = this.contract();
    if (!c) return;
    const installments = c.installments.map(i => i.id === res.installment.id ? res.installment : i);
    this.contract.set({
      ...c, installments,
      openBalance: res.contract.openBalance,
      openInstallments: res.contract.openInstallments,
      status: res.contract.status
    });
    // Invalida o histórico da parcela (se estava aberto) para recarregar.
    delete this.paymentsByInstallment[res.installment.id];
    this.timeline.set(null); // histórico será recarregado ao abrir a aba
  }

  // ---- Histórico + reversão ---------------------------------------------

  togglePayments(installment: LoanInstallmentResponse): void {
    if (this.expandedInstallmentId === installment.id) {
      this.expandedInstallmentId = null;
      this.cdr.markForCheck();
      return;
    }
    this.expandedInstallmentId = installment.id;
    if (!this.paymentsByInstallment[installment.id]) {
      this.loadingPayments.set(installment.id);
      this.loansService.listPayments(this.contractId, installment.id)
        .pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
          next: (items) => { this.paymentsByInstallment[installment.id] = items; this.loadingPayments.set(null); this.cdr.markForCheck(); },
          error: () => { this.loadingPayments.set(null); this.cdr.markForCheck(); }
        });
    }
    this.cdr.markForCheck();
  }

  reversePayment(installment: LoanInstallmentResponse, payment: LoanPaymentHistoryItem): void {
    if (this.reversing()) return;
    this.reversing.set(payment.id);
    this.loansService.reversePayment(this.contractId, installment.id, payment.id)
      .pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: (res) => {
          this.applyReversalResult(res);
          this.reversing.set(null);
          this.uiFeedback.success('Pagamento estornado.');
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.reversing.set(null);
          this.uiFeedback.error(extractApiErrorMessage(err, 'Falha ao estornar o pagamento.'));
          this.cdr.markForCheck();
        }
      });
  }

  private applyReversalResult(res: LoanPaymentResult): void {
    const c = this.contract();
    if (!c) return;
    const installments = c.installments.map(i => i.id === res.installment.id ? res.installment : i);
    this.contract.set({
      ...c, installments,
      openBalance: res.contract.openBalance,
      openInstallments: res.contract.openInstallments,
      status: res.contract.status
    });
    delete this.paymentsByInstallment[res.installment.id];
    this.timeline.set(null); // histórico será recarregado ao abrir a aba
    if (this.expandedInstallmentId === res.installment.id) this.expandedInstallmentId = null;
  }

  // ---- Amortização extraordinária ---------------------------------------

  openAmortSheet(): void {
    const c = this.contract();
    if (!c) return;
    this.amortSheetOpen = true;
    this.amortForm = { amount: 0, strategy: 'ReduceTerm', accountId: '' };
    this.amortPreview.set(null);
    this.amortIdempotencyKey = this.newKey();
    this.cdr.markForCheck();
  }

  cancelAmortSheet(): void {
    this.amortSheetOpen = false;
    this.amortPreview.set(null);
    this.cdr.markForCheck();
  }

  setAmortStrategy(value: string): void {
    this.amortForm.strategy = value as LoanAmortizationStrategy;
    this.amortPreview.set(null); // muda a estratégia → invalida o preview anterior
    this.cdr.markForCheck();
  }

  simulateAmort(): void {
    const c = this.contract();
    if (!c || (Number(this.amortForm.amount) || 0) <= 0) return;
    this.loansService.simulateAmortization(c.id, {
      amount: Number(this.amortForm.amount),
      strategy: this.amortForm.strategy,
      accountId: this.amortForm.accountId || null
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (res) => { this.amortPreview.set(res); this.cdr.markForCheck(); },
      error: (err) => { this.uiFeedback.error(extractApiErrorMessage(err, 'Falha ao simular amortização.')); this.cdr.markForCheck(); }
    });
  }

  confirmAmort(): void {
    const c = this.contract();
    if (!c || !this.amortPreview() || this.amortizing()) return;
    this.amortizing.set(true);
    this.loansService.confirmAmortization(c.id, {
      amount: Number(this.amortForm.amount),
      strategy: this.amortForm.strategy,
      accountId: this.amortForm.accountId || null
    }, this.amortIdempotencyKey).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.amortizing.set(false);
        this.amortSheetOpen = false;
        this.amortPreview.set(null);
        this.uiFeedback.success('Amortização registrada.');
        this.load(); // recarrega o contrato com o cronograma regenerado (fonte oficial)
      },
      error: (err) => {
        this.amortizing.set(false);
        this.uiFeedback.error(extractApiErrorMessage(err, 'Falha ao registrar a amortização.'));
        this.cdr.markForCheck();
      }
    });
  }

  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private newKey(): string {
    const cryptoRef = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
    return cryptoRef?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}
