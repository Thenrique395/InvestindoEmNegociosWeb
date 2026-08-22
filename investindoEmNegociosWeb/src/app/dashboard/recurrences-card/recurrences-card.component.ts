import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FinancialPrivacyService } from '../../financial-privacy.service';
import { TooltipComponent } from '../../shared/tooltip/tooltip.component';
import { formatCurrencyValue } from '../../utils/locale-utils';
import { buildRecurrencesView, RecurrenceEntry } from './recurrences-card.model';

const TOOLTIP =
  'Entradas e saídas que se repetem todo mês: assinaturas, contas fixas, parcelas e receitas ' +
  'recorrentes. O rodapé mostra o total fixo de saídas e quanto isso pesa na renda recorrente.';

@Component({
  selector: 'app-recurrences-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TooltipComponent],
  templateUrl: './recurrences-card.component.html',
  styleUrl: './recurrences-card.component.scss'
})
export class RecurrencesCardComponent {
  private readonly financialPrivacy = inject(FinancialPrivacyService);

  readonly entries = input.required<readonly RecurrenceEntry[]>();

  readonly tooltip = TOOLTIP;

  readonly view = computed(() => buildRecurrencesView(this.entries()));

  readonly fmt = computed(() => {
    const hidden = this.financialPrivacy.hidden();
    return (value: number) => (hidden ? '••••••' : formatCurrencyValue(value));
  });

  readonly shareLabel = computed(() => {
    const share = this.view().incomeShare;
    if (share === null) {
      return '—';
    }
    const rounded = Math.round(share * 10) / 10;
    return `${(rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1)).replace('.', ',')}% da renda`;
  });
}
