import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { findMarketingPlan, MarketingBillingCycle, MarketingPlan } from '../marketing-plans';

@Component({
  selector: 'app-checkout-pending',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './checkout-pending.component.html',
  styleUrl: './checkout-status.component.scss'
})
export class CheckoutPendingComponent {
  plan: MarketingPlan = findMarketingPlan(null);
  cycle: MarketingBillingCycle = 'Monthly';

  constructor(route: ActivatedRoute) {
    route.queryParamMap.subscribe((params) => {
      this.plan = findMarketingPlan(params.get('plan'));
      this.cycle = params.get('cycle') === 'Yearly' ? 'Yearly' : 'Monthly';
    });
  }
}
