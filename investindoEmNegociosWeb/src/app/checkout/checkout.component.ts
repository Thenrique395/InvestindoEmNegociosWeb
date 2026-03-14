import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SignupComponent } from '../signup/signup.component';
import { UiFeedbackService } from '../ui-feedback.service';
import { findMarketingPlan, MarketingBillingCycle, MarketingPlan } from '../marketing-plans';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, RouterLink, CurrencyPipe, SignupComponent],
  templateUrl: './checkout.component.html',
  styleUrl: './checkout.component.scss'
})
export class CheckoutComponent {
  selectedPlan: MarketingPlan = findMarketingPlan(null);
  selectedCycle: MarketingBillingCycle = 'Monthly';

  constructor(
    route: ActivatedRoute,
    private readonly uiFeedback: UiFeedbackService
  ) {
    route.queryParamMap.subscribe((params) => {
      this.selectedPlan = findMarketingPlan(params.get('plan'));
      this.selectedCycle = params.get('cycle') === 'Yearly' ? 'Yearly' : 'Monthly';
    });
  }

  get selectedPrice(): number {
    return this.selectedCycle === 'Yearly'
      ? this.selectedPlan.yearlyPrice
      : this.selectedPlan.monthlyPrice;
  }

  handleSignedUp(): void {
    const message = this.selectedPlan.code === 'basic'
      ? 'Conta criada. Faça login para começar no plano Essencial.'
      : `Conta criada. Faça login para continuar a contratação do plano ${this.selectedPlan.name}.`;
    this.uiFeedback.success(message);
  }
}
