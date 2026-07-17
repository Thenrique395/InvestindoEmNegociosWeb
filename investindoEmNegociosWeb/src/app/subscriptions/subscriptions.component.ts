import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../auth.service';
import { BillingService } from '../billing.service';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import { SubscriptionsService, SubscriptionCatalogResponse, SubscriptionPlan } from '../subscriptions.service';
import { UiFeedbackService } from '../ui-feedback.service';
import { extractApiErrorMessage } from '../utils/api-error.utils';
import { PageHeaderComponent } from '../shared/page-header/page-header.component';
import { SectionCardComponent } from '../shared/section-card/section-card.component';
import { TransactionSummaryCardComponent } from '../shared/transactions/transaction-summary-card.component';
import { StatusBadgeComponent } from '../shared/status-badge/status-badge.component';
import { SegmentedSelectorComponent, SegmentOption } from '../shared/segmented-selector/segmented-selector.component';
import { UiStateComponent } from '../ui-state/ui-state.component';

@Component({
  selector: 'app-subscriptions',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ConfirmDialogComponent,
    PageHeaderComponent,
    SectionCardComponent,
    TransactionSummaryCardComponent,
    StatusBadgeComponent,
    SegmentedSelectorComponent,
    UiStateComponent
  ],
  templateUrl: './subscriptions.component.html',
  styleUrl: './subscriptions.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SubscriptionsComponent implements OnInit {
  // Estado reativo por signal (A9): a resposta HTTP roda fora da zona (withFetch),
  // então signals garantem a re-renderização OnPush sem depender de tick de zona.
  readonly catalog = signal<SubscriptionCatalogResponse | null>(null);
  readonly loading = signal(true);
  readonly changingPlanCode = signal<string | null>(null);
  readonly changingCycle = signal<'Monthly' | 'Yearly'>('Monthly');
  readonly cancelling = signal(false);
  readonly openingPortal = signal(false);
  readonly requestingTrial = signal(false);
  readonly requestingRefund = signal(false);
  readonly retrying = signal(false);
  readonly confirmCancelOpen = signal(false);
  readonly confirmRefundOpen = signal(false);

  constructor(
    private readonly subscriptionsService: SubscriptionsService,
    private readonly authService: AuthService,
    private readonly billingService: BillingService,
    private readonly router: Router,
    private readonly uiFeedback: UiFeedbackService,
    private readonly cdr: ChangeDetectorRef,
    private readonly destroyRef: DestroyRef
  ) {}

  ngOnInit(): void {
    this.load();
  }

  get subscriptionStatus(): string {
    return (this.catalog()?.current.status || '').toLowerCase();
  }

  get isPastDue(): boolean {
    return this.subscriptionStatus === 'pastdue';
  }

  get isExpired(): boolean {
    return this.subscriptionStatus === 'expired';
  }

  get isPastDueCritical(): boolean {
    if (!this.isPastDue) return false;
    const renewsAt = this.catalog()?.current.renewsAt;
    if (!renewsAt) return false;
    return (Date.now() - new Date(renewsAt).getTime()) / 86_400_000 >= 6;
  }

  get gracePeriodEndsAtLabel(): string | null {
    if (!this.isPastDue) return null;
    const renewsAt = this.catalog()?.current.renewsAt;
    if (!renewsAt) return null;
    const endsAt = new Date(new Date(renewsAt).getTime() + 7 * 86_400_000);
    return endsAt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  get accessUntilLabel(): string | null {
    const renewsAt = this.catalog()?.current.renewsAt;
    if (!renewsAt) return null;
    return new Date(renewsAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  get showCancelButton(): boolean {
    const c = this.catalog()?.current;
    return !!c && c.autoRenew && this.subscriptionStatus === 'active' && c.planCode !== 'basic';
  }

  get showPortalButton(): boolean {
    const c = this.catalog()?.current;
    return !!c && c.planCode !== 'basic' && !c.isTrial;
  }

  get showTrialButton(): boolean {
    const c = this.catalog()?.current;
    return !!c && c.planCode === 'basic' && this.subscriptionStatus === 'active';
  }

  get showRetryButton(): boolean {
    return this.isPastDue;
  }

  get showRefundButton(): boolean {
    const c = this.catalog()?.current;
    if (!c || c.planCode === 'basic' || c.isTrial) return false;
    if (this.subscriptionStatus !== 'active') return false;
    const days = (Date.now() - new Date(c.startedAt).getTime()) / 86_400_000;
    return days <= 7;
  }

  readonly cycleOptions: SegmentOption[] = [
    { value: 'Monthly', label: 'Mensal' },
    { value: 'Yearly', label: 'Anual' }
  ];

  selectCycle(cycle: 'Monthly' | 'Yearly'): void {
    this.changingCycle.set(cycle);
  }

  setCycle(value: string): void {
    this.changingCycle.set(value === 'Yearly' ? 'Yearly' : 'Monthly');
  }

  change(plan: SubscriptionPlan): void {
    if (this.changingPlanCode()) return;
    if (plan.code !== 'basic') {
      this.router.navigate(['/checkout'], {
        queryParams: { plan: plan.code, cycle: this.changingCycle() }
      });
      return;
    }

    this.changingPlanCode.set(plan.code);
    this.subscriptionsService.change(plan.code, this.changingCycle())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.authService.applySession(response.session);
          this.catalog.set({
            current: response.current,
            plans: this.catalog()?.plans.map((item) => ({ ...item, current: item.code === response.current.planCode })) ?? [],
            notes: response.notes
          });
          this.uiFeedback.success(`Plano alterado para ${response.current.planName}.`);
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.uiFeedback.error(extractApiErrorMessage(err, 'Falha ao alterar plano.'));
          this.cdr.markForCheck();
        },
        complete: () => {
          this.changingPlanCode.set(null);
          this.cdr.markForCheck();
        }
      });
  }

  openPortal(): void {
    if (this.openingPortal()) return;
    this.openingPortal.set(true);
    this.billingService.createPortalSession()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          window.location.href = response.url;
        },
        error: (err) => {
          this.uiFeedback.error(extractApiErrorMessage(err, 'Não foi possível abrir o portal de cobrança.'));
          this.openingPortal.set(false);
          this.cdr.markForCheck();
        }
      });
  }

  cancel(): void {
    this.confirmCancelOpen.set(true);
  }

  performCancel(): void {
    this.confirmCancelOpen.set(false);
    if (this.cancelling()) return;
    this.cancelling.set(true);
    this.subscriptionsService.cancel()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.authService.applySession(response.session);
          this.catalog.set({
            current: response.current,
            plans: this.catalog()?.plans.map((item) => ({ ...item, current: item.code === response.current.planCode })) ?? [],
            notes: this.catalog()?.notes ?? []
          });
          this.uiFeedback.success('Renovação automática cancelada. Seu acesso segue ativo até o fim do ciclo atual.');
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.uiFeedback.error(extractApiErrorMessage(err, 'Falha ao cancelar o plano.'));
          this.cdr.markForCheck();
        },
        complete: () => {
          this.cancelling.set(false);
          this.cdr.markForCheck();
        }
      });
  }

  requestTrial(): void {
    if (this.requestingTrial()) return;
    this.requestingTrial.set(true);
    this.subscriptionsService.requestTrial()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.authService.applySession(response.session);
          this.catalog.set({
            current: response.current,
            plans: this.catalog()?.plans.map((item) => ({ ...item, current: item.code === response.current.planCode })) ?? [],
            notes: response.notes
          });
          this.uiFeedback.success('Período de teste ativado! Aproveite 7 dias de acesso Advanced.');
          this.requestingTrial.set(false);
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.uiFeedback.error(extractApiErrorMessage(err, 'Não foi possível ativar o período de teste.'));
          this.requestingTrial.set(false);
          this.cdr.markForCheck();
        }
      });
  }

  requestRefund(): void {
    this.confirmRefundOpen.set(true);
  }

  performRefund(): void {
    this.confirmRefundOpen.set(false);
    if (this.requestingRefund()) return;
    this.requestingRefund.set(true);
    this.subscriptionsService.requestRefund()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.authService.applySession(response.session);
          this.catalog.set({
            current: response.current,
            plans: this.catalog()?.plans.map((item) => ({ ...item, current: item.code === response.current.planCode })) ?? [],
            notes: response.notes
          });
          this.uiFeedback.success('Reembolso solicitado. O estorno será processado em até 5 dias úteis.');
          this.requestingRefund.set(false);
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.uiFeedback.error(extractApiErrorMessage(err, 'Não foi possível processar o reembolso.'));
          this.requestingRefund.set(false);
          this.cdr.markForCheck();
        }
      });
  }

  retryPayment(): void {
    if (this.retrying()) return;
    this.retrying.set(true);
    this.subscriptionsService.retryPayment()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.uiFeedback.success('Pagamento enviado. Seu acesso será reativado assim que a confirmação chegar.');
          this.retrying.set(false);
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.uiFeedback.error(extractApiErrorMessage(err, 'Não foi possível processar o pagamento.'));
          this.retrying.set(false);
          this.cdr.markForCheck();
        }
      });
  }

  private load(): void {
    this.loading.set(true);
    this.subscriptionsService.getCatalog()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (catalog) => {
          this.catalog.set(catalog);
          this.loading.set(false);
          this.cdr.markForCheck();
        },
        error: () => {
          this.catalog.set(null);
          this.loading.set(false);
          this.cdr.markForCheck();
        }
      });
  }
}
