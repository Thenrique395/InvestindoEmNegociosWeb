import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FinancialPrivacyService } from '../../financial-privacy.service';
import { TooltipComponent } from '../../shared/tooltip/tooltip.component';
import { formatCurrencyValue, formatNumberValue } from '../../utils/locale-utils';
import { buildGoalRows, GoalEntry } from './goals-card.model';

const TOOLTIP =
  'Objetivos com valor alvo e prazo. A barra mostra o progresso; a cor indica se o ritmo atual ' +
  'de aportes chega no prazo definido.';

@Component({
  selector: 'app-goals-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe, RouterLink, TooltipComponent],
  templateUrl: './goals-card.component.html',
  styleUrl: './goals-card.component.scss'
})
export class GoalsCardComponent {
  private readonly financialPrivacy = inject(FinancialPrivacyService);

  readonly entries = input.required<readonly GoalEntry[]>();
  readonly today = input.required<Date>();

  readonly tooltip = TOOLTIP;

  readonly rows = computed(() => buildGoalRows(this.entries(), this.today()));

  /**
   * "R$ 32.000 / 48.000": moeda só no primeiro número e sem centavos. Alvo de
   * meta é valor redondo, e repetir "R$" e ",00" nos dois lados dobra a largura
   * do par sem acrescentar informação.
   */
  readonly fmtCurrent = computed(() => {
    const hidden = this.financialPrivacy.hidden();
    return (value: number) =>
      hidden
        ? '••••'
        // Os dois limites: `maximumFractionDigits: 0` sozinho fica abaixo do
        // mínimo de 2 casas que a moeda impõe, e o Intl lança RangeError.
        : formatCurrencyValue(value, undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  });

  readonly fmtTarget = computed(() => {
    const hidden = this.financialPrivacy.hidden();
    return (value: number) =>
      hidden ? '••••' : formatNumberValue(value, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  });
}
