import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { CurrentSubscription, SubscriptionsService } from '../../core/subscriptions.service';

type AlertLevel = 'warning' | 'danger';

interface BillingAlert {
  level: AlertLevel;
  title: string;
  message: string;
  action: string;
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
  // Estado por signal (A9): alert vem de callback assíncrono (HTTP fora da zona).
  readonly alert = signal<BillingAlert | null>(null);

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
          this.alert.set(this.computeAlert(catalog.current));
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
        message: 'Atualize sua forma de pagamento para continuar com todos os recursos premium.',
        action: 'Atualizar pagamento'
      };
    }

    if (status === 'expired') {
      return {
        level: 'danger',
        title: 'Acesso premium encerrado',
        message: 'Seu acesso voltou para o plano Essencial. Reative o plano premium para restaurar todos os recursos.',
        action: 'Reativar plano'
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
          message: `A renovação automática está desativada. Seu acesso premium termina em ${dateStr}.`,
          action: 'Gerenciar assinatura'
        };
      }
    }

    return null;
  }
}
