import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../auth.service';
import { CurrentSubscription, SubscriptionsService } from '../../subscriptions.service';

type AlertLevel = 'warning' | 'danger';

interface BillingAlert {
  level: AlertLevel;
  title: string;
  message: string;
}

@Component({
  selector: 'app-billing-alert-banner',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './billing-alert-banner.component.html',
  styleUrl: './billing-alert-banner.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BillingAlertBannerComponent implements OnInit {
  alert: BillingAlert | null = null;

  constructor(
    private readonly subscriptionsService: SubscriptionsService,
    private readonly authService: AuthService,
    private readonly cdr: ChangeDetectorRef,
    private readonly destroyRef: DestroyRef
  ) {}

  ngOnInit(): void {
    const role = this.authService.getRole();
    if (!role || role === 'Basic') return;

    this.subscriptionsService.getCatalog()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (catalog) => {
          this.alert = this.computeAlert(catalog.current);
          this.cdr.markForCheck();
        },
        error: () => void 0
      });
  }

  private computeAlert(sub: CurrentSubscription): BillingAlert | null {
    const status = (sub.status || '').toLowerCase();

    if (status === 'pastdue') {
      return {
        level: 'danger',
        title: 'Pagamento em atraso',
        message: 'Há uma cobrança pendente na sua assinatura. Atualize seu meio de pagamento para manter o acesso.'
      };
    }

    if (status === 'expired') {
      return {
        level: 'danger',
        title: 'Assinatura expirada',
        message: 'Sua assinatura expirou e o acesso foi reduzido para o plano Basic. Contrate um novo plano para restaurar.'
      };
    }

    if (!sub.autoRenew && sub.renewsAt) {
      const renewDate = new Date(sub.renewsAt);
      const daysLeft = Math.ceil((renewDate.getTime() - Date.now()) / 86_400_000);
      if (daysLeft >= 0 && daysLeft <= 7) {
        const dateStr = renewDate.toLocaleDateString('pt-BR');
        return {
          level: 'warning',
          title: 'Acesso encerra em breve',
          message: `A renovação automática está desativada. Seu acesso premium termina em ${dateStr}.`
        };
      }
    }

    return null;
  }
}
