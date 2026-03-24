import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { SignupComponent } from '../signup/signup.component';
import { AuthService } from '../auth.service';
import { BillingService } from '../billing.service';
import { CheckoutIntentService } from '../checkout-intent.service';
import { MARKETING_PLANS, findMarketingPlan, MarketingBillingCycle, MarketingPlan } from '../marketing-plans';
import { SubscriptionsService } from '../subscriptions.service';
import { UiFeedbackService } from '../ui-feedback.service';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, RouterLink, CurrencyPipe, SignupComponent],
  templateUrl: './checkout.component.html',
  styleUrl: './checkout.component.scss'
})
export class CheckoutComponent {
  plans = MARKETING_PLANS;
  selectedPlan: MarketingPlan = findMarketingPlan(null);
  selectedCycle: MarketingBillingCycle = 'Monthly';
  processing = false;

  constructor(
    route: ActivatedRoute,
    private readonly router: Router,
    private readonly authService: AuthService,
    private readonly billingService: BillingService,
    private readonly checkoutIntent: CheckoutIntentService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly uiFeedback: UiFeedbackService
  ) {
    route.queryParamMap.subscribe((params) => {
      this.selectedPlan = findMarketingPlan(params.get('plan'));
      this.selectedCycle = params.get('cycle') === 'Yearly' ? 'Yearly' : 'Monthly';
      this.persistIntent();
    });
  }

  get selectedPrice(): number {
    return this.selectedCycle === 'Yearly'
      ? this.selectedPlan.yearlyPrice
      : this.selectedPlan.monthlyPrice;
  }

  get isLogged(): boolean {
    return this.authService.isAuthenticated();
  }

  selectPlan(planCode: string): void {
    const plan = findMarketingPlan(planCode);
    this.router.navigate([], {
      queryParams: { plan: plan.code, cycle: this.selectedCycle },
      queryParamsHandling: 'merge'
    });
  }

  selectCycle(cycle: MarketingBillingCycle): void {
    this.router.navigate([], {
      queryParams: { plan: this.selectedPlan.code, cycle },
      queryParamsHandling: 'merge'
    });
  }

  continueToLogin(): void {
    this.persistIntent();
    this.router.navigate(['/login'], {
      queryParams: {
        returnTo: '/checkout',
        plan: this.selectedPlan.code,
        cycle: this.selectedCycle
      }
    });
  }

  activatePlan(): void {
    if (this.processing) return;

    if (!this.isLogged) {
      this.continueToLogin();
      return;
    }

    this.processing = true;
    if (this.selectedPlan.code !== 'basic') {
      this.billingService.startCheckout(this.selectedPlan.code, this.selectedCycle).subscribe({
        next: (response) => {
          this.checkoutIntent.save({
            plan: this.selectedPlan.code,
            cycle: this.selectedCycle
          });
          if (response.checkoutUrl) {
            window.location.href = response.checkoutUrl;
            return;
          }
          this.router.navigate(['/checkout/pendente'], {
            queryParams: { checkout_id: response.checkoutId }
          });
        },
        error: (err) => {
          this.router.navigate(['/checkout/falha'], {
            queryParams: {
              plan: this.selectedPlan.code,
              cycle: this.selectedCycle,
              message: err?.error?.detail || 'Não foi possível iniciar o checkout de cobrança.'
            }
          });
        },
        complete: () => {
          this.processing = false;
        }
      });
      return;
    }

    this.subscriptionsService.change(this.selectedPlan.code, this.selectedCycle).subscribe({
      next: (response) => {
        this.authService.applySession(response.session);
        this.checkoutIntent.clear();
        this.uiFeedback.success(`Plano ${response.current.planName} ativado com sucesso.`);
        this.router.navigate(['/checkout/sucesso'], {
          queryParams: { plan: this.selectedPlan.code, cycle: this.selectedCycle }
        });
      },
      error: (err) => {
        this.router.navigate(['/checkout/falha'], {
          queryParams: {
            plan: this.selectedPlan.code,
            cycle: this.selectedCycle,
            message: err?.error?.detail || 'Não foi possível concluir a contratação neste momento.'
          }
        });
      },
      complete: () => {
        this.processing = false;
      }
    });
  }

  handleSignedUp(): void {
    this.persistIntent();
    const message = this.selectedPlan.code === 'basic'
      ? 'Conta criada. Agora entre para começar no plano Essencial.'
      : `Conta criada. Agora entre para concluir a contratação do plano ${this.selectedPlan.name}.`;
    this.uiFeedback.success(message);
    this.continueToLogin();
  }

  private persistIntent(): void {
    this.checkoutIntent.save({
      plan: this.selectedPlan.code,
      cycle: this.selectedCycle
    });
  }
}
