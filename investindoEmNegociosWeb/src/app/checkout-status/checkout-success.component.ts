
import { Component } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../auth.service';
import { BillingCheckoutStatusResponse, BillingService } from '../billing.service';
import { findMarketingPlan, MarketingBillingCycle, MarketingPlan } from '../marketing-plans';

@Component({
  selector: 'app-checkout-success',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './checkout-success.component.html',
  styleUrl: './checkout-status.component.scss'
})
export class CheckoutSuccessComponent {
  plan: MarketingPlan = findMarketingPlan(null);
  cycle: MarketingBillingCycle = 'Monthly';
  status: BillingCheckoutStatusResponse | null = null;
  loading = true;

  constructor(
    route: ActivatedRoute,
    private readonly billingService: BillingService,
    private readonly authService: AuthService
  ) {
    route.queryParamMap.subscribe((params) => {
      const sessionId = params.get('session_id');
      const checkoutId = params.get('checkout_id');
      this.plan = findMarketingPlan(params.get('plan'));
      this.cycle = params.get('cycle') === 'Yearly' ? 'Yearly' : 'Monthly';

      const request$ = sessionId
        ? this.billingService.getCheckoutStatusBySession(sessionId)
        : checkoutId
          ? this.billingService.getCheckoutStatus(checkoutId)
          : null;

      if (!request$) {
        this.loading = false;
        return;
      }

      request$.subscribe({
        next: (status) => {
          this.status = status;
          this.plan = findMarketingPlan(status.planCode);
          this.cycle = status.billingCycle === 'Yearly' ? 'Yearly' : 'Monthly';
          if (status.subscriptionActive && this.authService.isAuthenticated()) {
            this.authService.refresh().subscribe({ error: () => void 0 });
          }
          this.loading = false;
        },
        error: () => {
          this.loading = false;
        }
      });
    });
  }
}
