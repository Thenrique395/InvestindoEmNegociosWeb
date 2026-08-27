
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { BillingCheckoutStatusResponse, BillingService } from '../../core/billing.service';
import { findMarketingPlan, MarketingBillingCycle, MarketingPlan } from '../../core/marketing-plans';

@Component({
  selector: 'app-checkout-success',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './checkout-success.component.html',
  styleUrl: './checkout-status.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CheckoutSuccessComponent {
  // Estado por signal (A9): status/plan/cycle/loading vêm de callback assíncrono (HTTP fora da zona).
  readonly plan = signal<MarketingPlan>(findMarketingPlan(null));
  readonly cycle = signal<MarketingBillingCycle>('Monthly');
  readonly status = signal<BillingCheckoutStatusResponse | null>(null);
  readonly loading = signal(true);

  constructor(
    route: ActivatedRoute,
    private readonly billingService: BillingService,
    private readonly authService: AuthService
  ) {
    const cdr = inject(ChangeDetectorRef);
    const destroyRef = inject(DestroyRef);

    route.queryParamMap.pipe(takeUntilDestroyed(destroyRef)).subscribe((params) => {
      const sessionId = params.get('session_id');
      const checkoutId = params.get('checkout_id');
      this.plan.set(findMarketingPlan(params.get('plan')));
      this.cycle.set(params.get('cycle') === 'Yearly' ? 'Yearly' : 'Monthly');

      const request$ = sessionId
        ? this.billingService.getCheckoutStatusBySession(sessionId)
        : checkoutId
          ? this.billingService.getCheckoutStatus(checkoutId)
          : null;

      if (!request$) {
        this.loading.set(false);
        cdr.markForCheck();
        return;
      }

      request$.subscribe({
        next: (status) => {
          this.status.set(status);
          this.plan.set(findMarketingPlan(status.planCode));
          this.cycle.set(status.billingCycle === 'Yearly' ? 'Yearly' : 'Monthly');
          if (status.subscriptionActive && this.authService.isAuthenticated()) {
            this.authService.refresh().subscribe({ error: () => void 0 });
          }
          this.loading.set(false);
          cdr.markForCheck();
        },
        error: () => {
          this.loading.set(false);
          cdr.markForCheck();
        }
      });
    });
  }
}
