import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { FinancialPrivacyService } from '../../../core/financial-privacy.service';
import { UserRole } from '../../../core/roles';
import { KpiItem, KpiStripComponent } from '../../../shared/kpi-strip/kpi-strip.component';
import { formatCurrencyValue } from '../../../core/utils/locale-utils';
import { HealthScoreCardComponent } from '../health-score-card/health-score-card.component';
import {
  buildOverviewCards,
  buildOverviewEyebrow,
  buildOverviewGreeting,
  buildOverviewHealth,
  buildOverviewSummary,
  FinancialOverviewInput,
  OverviewPeriodo
} from './financial-overview.model';

const PERIODO_OPTIONS: { value: OverviewPeriodo; label: string }[] = [
  { value: 'month', label: 'Mês' },
  { value: 'quarter', label: 'Trimestre' },
  { value: 'year', label: 'Ano' }
];

@Component({
  selector: 'app-financial-overview',
  standalone: true,
  imports: [HealthScoreCardComponent, KpiStripComponent],
  templateUrl: './financial-overview.component.html',
  styleUrls: ['./financial-overview.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FinancialOverviewComponent {
  /**
   * Adapta os cards do modelo para o contrato da faixa. O modelo continua sendo a fonte
   * da semântica (tom, delta, barra, rota); o primitivo só sabe desenhar.
   */
  readonly kpiItems = computed<KpiItem[]>(() =>
    this.cards().map((card) => ({
      key: card.id,
      label: card.title,
      value: card.value,
      note: card.note,
      tooltip: card.tooltip ?? '',
      tone: card.tone,
      wash: card.wash,
      delta: card.delta,
      progress: card.progress,
      link: card.detailsRoute ? { route: card.detailsRoute, label: card.detailsLabel } : undefined,
    })),
  );

  private readonly financialPrivacy = inject(FinancialPrivacyService);

  readonly data = input.required<FinancialOverviewInput>();
  readonly role = input.required<UserRole | null>();
  readonly periodo = input.required<OverviewPeriodo>();
  readonly periodoLabel = input.required<string>();
  /** Nome do usuário logado, para a saudação. Vem do container — este componente não injeta auth. */
  readonly userName = input('');
  readonly loading = input(false);

  readonly periodoChange = output<OverviewPeriodo>();

  readonly periodoOptions = PERIODO_OPTIONS;
  readonly skeletonSlots = [0, 1, 2, 3, 4];

  readonly eyebrow = computed(() => buildOverviewEyebrow(this.periodoLabel()));

  /**
   * O título é a saudação, não o período — o período já está no eyebrow logo acima
   * (COMPONENTES.md §2 e TELAS.md §1).
   */
  readonly heading = computed(() => buildOverviewGreeting(this.userName()));

  readonly summary = computed(() => buildOverviewSummary(this.data(), this.role(), this.periodo()));

  readonly health = computed(() => buildOverviewHealth(this.data(), this.role()));

  readonly cards = computed(() => {
    const hidden = this.financialPrivacy.hidden();
    const fmt = (value: number) => (hidden ? '••••••' : formatCurrencyValue(value));
    return buildOverviewCards(this.data(), this.role(), this.periodo(), fmt);
  });
}
