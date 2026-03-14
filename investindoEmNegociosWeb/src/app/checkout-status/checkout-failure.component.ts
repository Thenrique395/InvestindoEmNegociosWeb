import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
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

  constructor(route: ActivatedRoute) {
    route.queryParamMap.subscribe((params) => {
      this.plan = findMarketingPlan(params.get('plan'));
      this.cycle = params.get('cycle') === 'Yearly' ? 'Yearly' : 'Monthly';
      this.message = params.get('message') || this.message;
    });
  }
}
