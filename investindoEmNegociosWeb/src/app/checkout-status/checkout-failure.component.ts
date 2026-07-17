
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, inject, signal } from '@angular/core';
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
  // Estado por signal (A9): status/plan/cycle/message vêm de callbacks assíncronos
  // (HTTP fora da zona), então signals dirigem a re-render OnPush.
  readonly plan = signal<MarketingPlan>(findMarketingPlan(null));
  readonly cycle = signal<MarketingBillingCycle>('Monthly');
  readonly message = signal('Não foi possível concluir a contratação neste momento.');
  readonly status = signal<BillingCheckoutStatusResponse | null>(null);
  readonly openingPortal = signal(false);

  private readonly cdr = inject(ChangeDetectorRef);

  constructor(
    route: ActivatedRoute,
    private readonly billingService: BillingService
  ) {
    const destroyRef = inject(DestroyRef);

    route.queryParamMap.pipe(takeUntilDestroyed(destroyRef)).subscribe((params) => {
      const checkoutId = params.get('checkout_id');
      this.plan.set(findMarketingPlan(params.get('plan')));
      this.cycle.set(params.get('cycle') === 'Yearly' ? 'Yearly' : 'Monthly');
      this.message.set(params.get('message') || this.message());
      if (!checkoutId) return;
      this.billingService.getCheckoutStatus(checkoutId).subscribe({
        next: (s) => {
          this.status.set(s);
          this.plan.set(findMarketingPlan(s.planCode));
          this.cycle.set(s.billingCycle === 'Yearly' ? 'Yearly' : 'Monthly');
          this.message.set(s.failureReason || this.message());
          this.cdr.markForCheck();
        },
        error: () => void 0
      });
    });
  }

  openPortal(): void {
    if (this.openingPortal()) return;
    this.openingPortal.set(true);
    this.billingService.createPortalSession().subscribe({
      next: (response) => { window.location.href = response.url; },
      error: () => { this.openingPortal.set(false); this.cdr.markForCheck(); }
    });
  }
}
