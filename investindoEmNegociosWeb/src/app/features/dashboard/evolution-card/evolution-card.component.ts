import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { ChartLineComponent, LineSeries } from '../../../shared/charts/chart-line/chart-line.component';
import { TooltipComponent } from '../../../shared/tooltip/tooltip.component';
import { FinancialPrivacyService } from '../../../core/financial-privacy.service';
import { UserRole } from '../../../core/roles';
import { formatCurrencyValue } from '../../../core/utils/locale-utils';
import { buildEvolutionAxisNote, buildEvolutionView, EvolutionInput } from './evolution-card.model';

/**
 * Evolução do dashboard — TELAS.md §1.
 *
 * Substitui as duas seções que existiam antes ("Evolução patrimonial" e
 * "Evolução do caixa"): eram o mesmo card com séries diferentes, cada um com o
 * próprio SVG escrito à mão. O desenho agora é do `app-chart-line`
 * (ARQUITETURA_ANGULAR.md §8) e o que muda por perfil vem do modelo.
 */
@Component({
  selector: 'app-evolution-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ChartLineComponent, TooltipComponent],
  templateUrl: './evolution-card.component.html',
  styleUrl: './evolution-card.component.scss'
})
export class EvolutionCardComponent {
  private readonly financialPrivacy = inject(FinancialPrivacyService);

  readonly data = input.required<EvolutionInput>();
  readonly role = input.required<UserRole | null>();

  readonly view = computed(() => buildEvolutionView(this.data(), this.role()));

  readonly chartSeries = computed<LineSeries[]>(() =>
    this.view().series.map((s) => ({
      label: s.label,
      color: s.color,
      points: s.values,
      emphasis: s.emphasis,
      axis: s.axis
    }))
  );

  /** Respeita "ocultar valores" do topbar, como o resto do dashboard. */
  readonly fmt = computed(() => {
    const hidden = this.financialPrivacy.hidden();
    return (value: number) => (hidden ? '••••' : formatCurrencyValue(value));
  });

  readonly headlineValue = computed(() => this.fmt()(this.view().value));

  readonly axisNote = computed(() => buildEvolutionAxisNote(this.data(), this.role(), compactCurrency));

  /** Eixo em forma curta; o tooltip do ponto continua com o valor por extenso. */
  readonly tickFormat = computed(() => {
    const hidden = this.financialPrivacy.hidden();
    return (value: number) => (hidden ? '••••' : compactCurrency(value));
  });

  /** Fatia do topo para a linha de patrimônio, na proporção do protótipo. */
  readonly secondaryBand = computed(() =>
    this.chartSeries().some((s) => s.axis === 'secondary') ? 0.52 : 0,
  );
}

/**
 * O eixo usa forma curta ("R$ 21 mil"): o valor por extenso repetido três vezes
 * na lateral rouba a largura do desenho justo no card mais estreito.
 */
function compactCurrency(value: number): string {
  const abs = Math.abs(value);
  const sinal = value < 0 ? '−' : '';
  if (abs >= 1_000_000) {
    return `${sinal}R$ ${trim(abs / 1_000_000)} mi`;
  }
  if (abs >= 1_000) {
    return `${sinal}R$ ${trim(abs / 1_000)} mil`;
  }
  return `${sinal}R$ ${Math.round(abs)}`;
}

function trim(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return (rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1)).replace('.', ',');
}
