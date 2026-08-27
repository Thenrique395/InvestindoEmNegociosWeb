import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FinancialPrivacyService } from '../../../core/financial-privacy.service';
import { TooltipComponent } from '../../../shared/tooltip/tooltip.component';
import { formatCurrencyValue } from '../../../core/utils/locale-utils';

export interface ActivityItem {
  id: string;
  title: string;
  /** Data já formatada pelo container ("05 ago"). */
  dateLabel: string;
  /** Categoria, conta ou fonte — o que qualifica o lançamento. */
  context: string;
  amount: number;
  type: 'income' | 'expense';
}

const TOOLTIP =
  'Os últimos lançamentos registrados, em ordem de data. Use para conferir se algo entrou errado ' +
  'ou duplicado.';

/**
 * "Atividade recente" — TELAS.md §1: últimos lançamentos.
 *
 * Substitui o `app-dashboard-activity-board`, que juntava extrato e lembretes
 * num card só. Os lembretes viraram "Precisa da sua atenção" e "Próximos 7
 * dias", que dizem o que fazer; aqui ficou só o que já aconteceu.
 */
@Component({
  selector: 'app-recent-activity-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TooltipComponent],
  templateUrl: './recent-activity-card.component.html',
  styleUrl: './recent-activity-card.component.scss'
})
export class RecentActivityCardComponent {
  private readonly financialPrivacy = inject(FinancialPrivacyService);

  readonly items = input.required<readonly ActivityItem[]>();
  readonly limit = input(5);

  readonly tooltip = TOOLTIP;

  readonly rows = computed(() => this.items().slice(0, this.limit()));

  readonly fmt = computed(() => {
    const hidden = this.financialPrivacy.hidden();
    return (value: number) => (hidden ? '••••••' : formatCurrencyValue(value));
  });

  detail(item: ActivityItem): string {
    return [item.dateLabel, item.context].filter(Boolean).join(' · ');
  }
}
