import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FinancialPrivacyService } from '../../financial-privacy.service';
import { TooltipComponent } from '../../shared/tooltip/tooltip.component';
import { formatCurrencyValue } from '../../utils/locale-utils';
import { buildSpendBreakdown, SpendSlice } from './spend-breakdown-card.model';

const TOOLTIP =
  'Distribuição das despesas do mês por categoria, da maior para a menor. Serve para identificar ' +
  'rapidamente onde o gasto se concentrou.';

@Component({
  selector: 'app-spend-breakdown-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TooltipComponent],
  templateUrl: './spend-breakdown-card.component.html',
  styleUrl: './spend-breakdown-card.component.scss'
})
export class SpendBreakdownCardComponent {
  private readonly financialPrivacy = inject(FinancialPrivacyService);

  readonly slices = input.required<readonly SpendSlice[]>();
  readonly periodLabel = input('');
  /** Sem orçamento no plano, o rodapé vira convite em vez de análise. */
  readonly canBudget = input(true);

  readonly tooltip = TOOLTIP;

  readonly view = computed(() => buildSpendBreakdown(this.slices()));

  readonly fmt = computed(() => {
    const hidden = this.financialPrivacy.hidden();
    return (value: number) => (hidden ? '••••••' : formatCurrencyValue(value));
  });
}
