import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FinancialPrivacyService } from '../../financial-privacy.service';
import { TooltipComponent } from '../../shared/tooltip/tooltip.component';
import { formatCurrencyValue } from '../../utils/locale-utils';
import { AttentionInput, buildAttentionItems } from './attention-card.model';

const TOOLTIP =
  'Reúne o que está vencido, o que vence nos próximos dias e as faturas de cartão prestes a fechar. ' +
  'Se estiver vazio, não há pendência exigindo ação hoje.';

@Component({
  selector: 'app-attention-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TooltipComponent],
  templateUrl: './attention-card.component.html',
  styleUrl: './attention-card.component.scss'
})
export class AttentionCardComponent {
  private readonly financialPrivacy = inject(FinancialPrivacyService);

  readonly data = input.required<AttentionInput>();

  readonly tooltip = TOOLTIP;

  readonly items = computed(() => {
    const hidden = this.financialPrivacy.hidden();
    const fmt = (value: number) => (hidden ? '••••••' : formatCurrencyValue(value));
    return buildAttentionItems(this.data(), fmt);
  });
}
