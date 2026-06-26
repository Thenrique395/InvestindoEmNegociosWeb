import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../auth.service';
import { BillingService } from '../billing.service';
import { SubscriptionsService, SubscriptionCatalogResponse, SubscriptionPlan } from '../subscriptions.service';
import { UiFeedbackService } from '../ui-feedback.service';
import { extractApiErrorMessage } from '../utils/api-error.utils';

@Component({
  selector: 'app-subscriptions',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './subscriptions.component.html',
  styleUrl: './subscriptions.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SubscriptionsComponent implements OnInit {
  catalog: SubscriptionCatalogResponse | null = null;
  loading = true;
  changingPlanCode: string | null = null;
  changingCycle: 'Monthly' | 'Yearly' = 'Monthly';
  cancelling = false;
  openingPortal = false;
  requestingTrial = false;
  requestingRefund = false;
  retrying = false;

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
    return (this.catalog?.current.status || '').toLowerCase();
  }

  get isPastDue(): boolean {
    return this.subscriptionStatus === 'pastdue';
  }

  get isExpired(): boolean {
    return this.subscriptionStatus === 'expired';
  }

  get isPastDueCritical(): boolean {
    if (!this.isPastDue) return false;
    const renewsAt = this.catalog?.current.renewsAt;
    if (!renewsAt) return false;
    return (Date.now() - new Date(renewsAt).getTime()) / 86_400_000 >= 6;
  }

  get gracePeriodEndsAtLabel(): string | null {
    if (!this.isPastDue) return null;
    const renewsAt = this.catalog?.current.renewsAt;
    if (!renewsAt) return null;
    const endsAt = new Date(new Date(renewsAt).getTime() + 7 * 86_400_000);
    return endsAt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  get accessUntilLabel(): string | null {
    const renewsAt = this.catalog?.current.renewsAt;
    if (!renewsAt) return null;
    return new Date(renewsAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  get showCancelButton(): boolean {
    const c = this.catalog?.current;
    return !!c && c.autoRenew && this.subscriptionStatus === 'active' && c.planCode !== 'basic';
  }

  get showPortalButton(): boolean {
    const c = this.catalog?.current;
    return !!c && c.planCode !== 'basic' && !c.isTrial;
  }

  get showTrialButton(): boolean {
    const c = this.catalog?.current;
    return !!c && c.planCode === 'basic' && this.subscriptionStatus === 'active';
  }

  get showRetryButton(): boolean {
    return this.isPastDue;
  }

  get showRefundButton(): boolean {
    const c = this.catalog?.current;
    if (!c || c.planCode === 'basic' || c.isTrial) return false;
    if (this.subscriptionStatus !== 'active') return false;
    const days = (Date.now() - new Date(c.startedAt).getTime()) / 86_400_000;
    return days <= 7;
  }

  selectCycle(cycle: 'Monthly' | 'Yearly'): void {
    this.changingCycle = cycle;
  }

  change(plan: SubscriptionPlan): void {
    if (this.changingPlanCode) return;
    if (plan.code !== 'basic') {
      this.router.navigate(['/checkout'], {
        queryParams: { plan: plan.code, cycle: this.changingCycle }
      });
      return;
    }

    this.changingPlanCode = plan.code;
    this.subscriptionsService.change(plan.code, this.changingCycle)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.authService.applySession(response.session);
          this.catalog = {
            current: response.current,
            plans: this.catalog?.plans.map((item) => ({ ...item, current: item.code === response.current.planCode })) ?? [],
            notes: response.notes
          };
          this.uiFeedback.success(`Plano alterado para ${response.current.planName}.`);
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.uiFeedback.error(extractApiErrorMessage(err, 'Falha ao alterar plano.'));
          this.cdr.markForCheck();
        },
        complete: () => {
          this.changingPlanCode = null;
          this.cdr.markForCheck();
        }
      });
  }

  openPortal(): void {
    if (this.openingPortal) return;
    this.openingPortal = true;
    this.billingService.createPortalSession()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          window.location.href = response.url;
        },
        error: (err) => {
          this.uiFeedback.error(extractApiErrorMessage(err, 'Não foi possível abrir o portal de cobrança.'));
          this.openingPortal = false;
          this.cdr.markForCheck();
        }
      });
  }

  cancel(): void {
    if (this.cancelling) return;
    this.cancelling = true;
    this.subscriptionsService.cancel()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.authService.applySession(response.session);
          this.catalog = {
            current: response.current,
            plans: this.catalog?.plans.map((item) => ({ ...item, current: item.code === response.current.planCode })) ?? [],
            notes: this.catalog?.notes ?? []
          };
          this.uiFeedback.success('Renovação automática cancelada. Seu acesso segue ativo até o fim do ciclo atual.');
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.uiFeedback.error(extractApiErrorMessage(err, 'Falha ao cancelar o plano.'));
          this.cdr.markForCheck();
        },
        complete: () => {
          this.cancelling = false;
          this.cdr.markForCheck();
        }
      });
  }

  requestTrial(): void {
    if (this.requestingTrial) return;
    this.requestingTrial = true;
    this.subscriptionsService.requestTrial()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.authService.applySession(response.session);
          this.catalog = {
            current: response.current,
            plans: this.catalog?.plans.map((item) => ({ ...item, current: item.code === response.current.planCode })) ?? [],
            notes: response.notes
          };
          this.uiFeedback.success('Período de teste ativado! Aproveite 7 dias de acesso Advanced.');
          this.requestingTrial = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.uiFeedback.error(extractApiErrorMessage(err, 'Não foi possível ativar o período de teste.'));
          this.requestingTrial = false;
          this.cdr.markForCheck();
        }
      });
  }

  requestRefund(): void {
    if (this.requestingRefund) return;
    this.requestingRefund = true;
    this.subscriptionsService.requestRefund()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.authService.applySession(response.session);
          this.catalog = {
            current: response.current,
            plans: this.catalog?.plans.map((item) => ({ ...item, current: item.code === response.current.planCode })) ?? [],
            notes: response.notes
          };
          this.uiFeedback.success('Reembolso solicitado. O estorno será processado em até 5 dias úteis.');
          this.requestingRefund = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.uiFeedback.error(extractApiErrorMessage(err, 'Não foi possível processar o reembolso.'));
          this.requestingRefund = false;
          this.cdr.markForCheck();
        }
      });
  }

  retryPayment(): void {
    if (this.retrying) return;
    this.retrying = true;
    this.subscriptionsService.retryPayment()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.uiFeedback.success('Pagamento enviado. Seu acesso será reativado assim que a confirmação chegar.');
          this.retrying = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.uiFeedback.error(extractApiErrorMessage(err, 'Não foi possível processar o pagamento.'));
          this.retrying = false;
          this.cdr.markForCheck();
        }
      });
  }

  private load(): void {
    this.loading = true;
    this.subscriptionsService.getCatalog()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (catalog) => {
          this.catalog = catalog;
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.catalog = null;
          this.loading = false;
          this.cdr.markForCheck();
        }
      });
  }
}
