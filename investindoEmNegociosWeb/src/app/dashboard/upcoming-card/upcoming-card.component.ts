import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FinancialPrivacyService } from '../../financial-privacy.service';
import { TooltipComponent } from '../../shared/tooltip/tooltip.component';
import { formatCurrencyValue } from '../../utils/locale-utils';
import { buildUpcomingView, UpcomingEntry } from './upcoming-card.model';

const TOOLTIP =
  'Agenda curta da semana: o que vence e o que você tem a receber, em ordem de data. ' +
  'Serve para não ser pego de surpresa por uma conta.';

@Component({
  selector: 'app-upcoming-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TooltipComponent],
  templateUrl: './upcoming-card.component.html',
  styleUrl: './upcoming-card.component.scss'
})
export class UpcomingCardComponent {
  private readonly financialPrivacy = inject(FinancialPrivacyService);

  readonly entries = input.required<readonly UpcomingEntry[]>();
  readonly today = input.required<Date>();

  readonly tooltip = TOOLTIP;

  readonly view = computed(() => buildUpcomingView(this.entries(), this.today()));

  readonly fmt = computed(() => {
    const hidden = this.financialPrivacy.hidden();
    return (value: number) => (hidden ? '••••••' : formatCurrencyValue(value));
  });
}
