
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { BillingCheckoutStatusResponse, BillingService } from '../billing.service';
import { findMarketingPlan, MarketingBillingCycle, MarketingPlan } from '../marketing-plans';

@Component({
  selector: 'app-checkout-pending',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './checkout-pending.component.html',
  styleUrl: './checkout-status.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CheckoutPendingComponent {
  // Estado por signal (A9): status/plan/cycle vêm de callback assíncrono (HTTP fora da zona).
  readonly plan = signal<MarketingPlan>(findMarketingPlan(null));
  readonly cycle = signal<MarketingBillingCycle>('Monthly');
  readonly status = signal<BillingCheckoutStatusResponse | null>(null);

  constructor(route: ActivatedRoute, private readonly billingService: BillingService) {
    const cdr = inject(ChangeDetectorRef);
    const destroyRef = inject(DestroyRef);

    route.queryParamMap.pipe(takeUntilDestroyed(destroyRef)).subscribe((params) => {
      const checkoutId = params.get('checkout_id');
      this.plan.set(findMarketingPlan(params.get('plan')));
      this.cycle.set(params.get('cycle') === 'Yearly' ? 'Yearly' : 'Monthly');
      if (!checkoutId) return;
      this.billingService.getCheckoutStatus(checkoutId).subscribe({
        next: (status) => {
          this.status.set(status);
          this.plan.set(findMarketingPlan(status.planCode));
          this.cycle.set(status.billingCycle === 'Yearly' ? 'Yearly' : 'Monthly');
          cdr.markForCheck();
        },
        error: () => void 0
      });
    });
  }
}
