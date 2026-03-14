import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MARKETING_PLANS, MarketingBillingCycle } from '../marketing-plans';

@Component({
  selector: 'app-pricing',
  standalone: true,
  imports: [CommonModule, RouterLink, CurrencyPipe],
  templateUrl: './pricing.component.html',
  styleUrl: './pricing.component.scss'
})
export class PricingComponent {
  cycle: MarketingBillingCycle = 'Monthly';
  plans = MARKETING_PLANS;

  selectCycle(cycle: MarketingBillingCycle): void {
    this.cycle = cycle;
  }
}
