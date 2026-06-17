
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, inject } from '@angular/core';
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
  plan: MarketingPlan = findMarketingPlan(null);
  cycle: MarketingBillingCycle = 'Monthly';
  status: BillingCheckoutStatusResponse | null = null;

  constructor(route: ActivatedRoute, private readonly billingService: BillingService) {
    const cdr = inject(ChangeDetectorRef);
    const destroyRef = inject(DestroyRef);

    route.queryParamMap.pipe(takeUntilDestroyed(destroyRef)).subscribe((params) => {
      const checkoutId = params.get('checkout_id');
      this.plan = findMarketingPlan(params.get('plan'));
      this.cycle = params.get('cycle') === 'Yearly' ? 'Yearly' : 'Monthly';
      if (!checkoutId) return;
      this.billingService.getCheckoutStatus(checkoutId).subscribe({
        next: (status) => {
          this.status = status;
          this.plan = findMarketingPlan(status.planCode);
          this.cycle = status.billingCycle === 'Yearly' ? 'Yearly' : 'Monthly';
          cdr.markForCheck();
        },
        error: () => void 0
      });
    });
  }
}
