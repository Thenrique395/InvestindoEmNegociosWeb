
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { BillingCheckoutStatusResponse, BillingService } from '../billing.service';
import { findMarketingPlan, MarketingBillingCycle, MarketingPlan } from '../marketing-plans';

@Component({
  selector: 'app-checkout-failure',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './checkout-failure.component.html',
  styleUrl: './checkout-status.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CheckoutFailureComponent {
  plan: MarketingPlan = findMarketingPlan(null);
  cycle: MarketingBillingCycle = 'Monthly';
  message = 'Não foi possível concluir a contratação neste momento.';
  status: BillingCheckoutStatusResponse | null = null;
  openingPortal = false;

  private readonly cdr = inject(ChangeDetectorRef);

  constructor(
    route: ActivatedRoute,
    private readonly billingService: BillingService
  ) {
    const destroyRef = inject(DestroyRef);

    route.queryParamMap.pipe(takeUntilDestroyed(destroyRef)).subscribe((params) => {
      const checkoutId = params.get('checkout_id');
      this.plan = findMarketingPlan(params.get('plan'));
      this.cycle = params.get('cycle') === 'Yearly' ? 'Yearly' : 'Monthly';
      this.message = params.get('message') || this.message;
      if (!checkoutId) return;
      this.billingService.getCheckoutStatus(checkoutId).subscribe({
        next: (s) => {
          this.status = s;
          this.plan = findMarketingPlan(s.planCode);
          this.cycle = s.billingCycle === 'Yearly' ? 'Yearly' : 'Monthly';
          this.message = s.failureReason || this.message;
          this.cdr.markForCheck();
        },
        error: () => void 0
      });
    });
  }

  openPortal(): void {
    if (this.openingPortal) return;
    this.openingPortal = true;
    this.billingService.createPortalSession().subscribe({
      next: (response) => { window.location.href = response.url; },
      error: () => { this.openingPortal = false; this.cdr.markForCheck(); }
    });
  }
}
