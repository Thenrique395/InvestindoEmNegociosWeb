import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { BillingCheckoutStatusResponse, BillingService } from '../billing.service';
import { findMarketingPlan, MarketingBillingCycle, MarketingPlan } from '../marketing-plans';

@Component({
  selector: 'app-checkout-failure',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './checkout-failure.component.html',
  styleUrl: './checkout-status.component.scss'
})
export class CheckoutFailureComponent {
  plan: MarketingPlan = findMarketingPlan(null);
  cycle: MarketingBillingCycle = 'Monthly';
  message = 'Não foi possível concluir a contratação neste momento.';
  status: BillingCheckoutStatusResponse | null = null;

  constructor(route: ActivatedRoute, private readonly billingService: BillingService) {
    route.queryParamMap.subscribe((params) => {
      const checkoutId = params.get('checkout_id');
      this.plan = findMarketingPlan(params.get('plan'));
      this.cycle = params.get('cycle') === 'Yearly' ? 'Yearly' : 'Monthly';
      this.message = params.get('message') || this.message;
      if (!checkoutId) return;
      this.billingService.getCheckoutStatus(checkoutId).subscribe({
        next: (status) => {
          this.status = status;
          this.plan = findMarketingPlan(status.planCode);
          this.cycle = status.billingCycle === 'Yearly' ? 'Yearly' : 'Monthly';
          this.message = status.failureReason || this.message;
        },
        error: () => void 0
      });
    });
  }
}
