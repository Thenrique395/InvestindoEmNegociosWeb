import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FinancialPrivacyService } from '../../financial-privacy.service';
import { UserRole } from '../../roles';
import { TooltipComponent } from '../../shared/tooltip/tooltip.component';
import { formatCurrencyValue } from '../../utils/locale-utils';
import {
  buildOverviewCards,
  buildOverviewSummary,
  FinancialOverviewInput,
  OverviewPeriodo
} from './financial-overview.model';

const PERIODO_OPTIONS: { value: OverviewPeriodo; label: string }[] = [
  { value: 'month', label: 'Mensal' },
  { value: 'quarter', label: 'Trimestral' },
  { value: 'year', label: 'Anual' }
];

@Component({
  selector: 'app-financial-overview',
  standalone: true,
  imports: [RouterLink, TooltipComponent],
  templateUrl: './financial-overview.component.html',
  styleUrls: ['./financial-overview.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FinancialOverviewComponent {
  private readonly financialPrivacy = inject(FinancialPrivacyService);

  readonly data = input.required<FinancialOverviewInput>();
  readonly role = input.required<UserRole | null>();
  readonly periodo = input.required<OverviewPeriodo>();
  readonly periodoLabel = input.required<string>();
  readonly loading = input(false);

  readonly periodoChange = output<OverviewPeriodo>();

  readonly periodoOptions = PERIODO_OPTIONS;
  readonly skeletonSlots = [0, 1, 2, 3];

  readonly heading = computed(() => {
    const label = this.periodoLabel();
    return /^(Trimestre|Ano)/.test(label)
      ? `Visão Geral Financeira do ${label.charAt(0).toLowerCase()}${label.slice(1)}`
      : `Visão Geral Financeira de ${label}`;
  });

  readonly summary = computed(() => buildOverviewSummary(this.data(), this.role(), this.periodo()));

  readonly cards = computed(() => {
    const hidden = this.financialPrivacy.hidden();
    const fmt = (value: number) => (hidden ? '••••••' : formatCurrencyValue(value));
    return buildOverviewCards(this.data(), this.role(), this.periodo(), fmt);
  });
}
