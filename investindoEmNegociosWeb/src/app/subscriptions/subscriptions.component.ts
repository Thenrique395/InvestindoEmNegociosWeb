import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../auth.service';
import { BillingService } from '../billing.service';
import { SubscriptionsService, SubscriptionCatalogResponse, SubscriptionPlan } from '../subscriptions.service';
import { UiFeedbackService } from '../ui-feedback.service';

@Component({
  selector: 'app-subscriptions',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './subscriptions.component.html',
  styleUrl: './subscriptions.component.scss'
})
export class SubscriptionsComponent {
  catalog: SubscriptionCatalogResponse | null = null;
  loading = true;
  changingPlanCode: string | null = null;
  changingCycle: 'Monthly' | 'Yearly' = 'Monthly';
  cancelling = false;
  openingPortal = false;

  constructor(
    private readonly subscriptionsService: SubscriptionsService,
    private readonly authService: AuthService,
    private readonly billingService: BillingService,
    private readonly router: Router,
    private readonly uiFeedback: UiFeedbackService
  ) {
    this.load();
  }

  selectCycle(cycle: 'Monthly' | 'Yearly'): void {
    this.changingCycle = cycle;
  }

  change(plan: SubscriptionPlan): void {
    if (this.changingPlanCode) return;
    if (plan.code !== 'basic') {
      this.router.navigate(['/checkout'], {
        queryParams: { plan: plan.code, cycle: this.changingCycle }
      });
      return;
    }

    this.changingPlanCode = plan.code;
    this.subscriptionsService.change(plan.code, this.changingCycle).subscribe({
      next: (response) => {
        this.authService.applySession(response.session);
        this.catalog = {
          current: response.current,
          plans: this.catalog?.plans.map((item) => ({ ...item, current: item.code === response.current.planCode })) ?? [],
          notes: response.notes
        };
        this.uiFeedback.success(`Plano alterado para ${response.current.planName}.`);
      },
      error: (err) => {
        this.uiFeedback.error(err?.error?.detail || 'Falha ao alterar plano.');
      },
      complete: () => {
        this.changingPlanCode = null;
      }
    });
  }

  openPortal(): void {
    if (this.openingPortal) return;
    this.openingPortal = true;
    this.billingService.createPortalSession().subscribe({
      next: (response) => {
        window.location.href = response.url;
      },
      error: (err) => {
        this.uiFeedback.error(err?.error?.detail || 'Não foi possível abrir o portal de cobrança.');
        this.openingPortal = false;
      }
    });
  }

  cancel(): void {
    if (this.cancelling) return;
    this.cancelling = true;
    this.subscriptionsService.cancel().subscribe({
      next: (response) => {
        this.authService.applySession(response.session);
        this.catalog = {
          current: response.current,
          plans: this.catalog?.plans.map((item) => ({ ...item, current: item.code === response.current.planCode })) ?? [],
          notes: this.catalog?.notes ?? []
        };
        this.uiFeedback.success('Renovação automática cancelada. O acesso volta para Basic.');
      },
      error: (err) => {
        this.uiFeedback.error(err?.error?.detail || 'Falha ao cancelar o plano.');
      },
      complete: () => {
        this.cancelling = false;
      }
    });
  }

  private load(): void {
    this.loading = true;
    this.subscriptionsService.getCatalog().subscribe({
      next: (catalog) => {
        this.catalog = catalog;
        this.loading = false;
      },
      error: () => {
        this.catalog = null;
        this.loading = false;
      }
    });
  }
}
