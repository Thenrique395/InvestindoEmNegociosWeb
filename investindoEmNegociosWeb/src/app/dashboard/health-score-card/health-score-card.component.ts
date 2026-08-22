import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { AiHealthStatus } from '../../financial-assistant.service';
import { TooltipComponent } from '../../shared/tooltip/tooltip.component';
import { OverviewHealth } from '../financial-overview/financial-overview.model';

const FACTOR_TONE: Record<AiHealthStatus, string> = {
  critical: 'danger',
  warning: 'warning',
  ok: 'success'
};

const FACTOR_LABEL: Record<AiHealthStatus, string> = {
  critical: 'crítico',
  warning: 'atenção',
  ok: 'estável'
};

const TOOLTIP =
  'Nota de 0 a 100 calculada pela análise automática a partir dos sinais listados ao lado: ' +
  'cobertura da reserva, peso das dívidas na renda, quanto da renda você guarda e o quanto ' +
  'se mantém dentro do orçamento.';

/**
 * Saúde financeira do topo do dashboard — TELAS.md §1, "índice de 0 a 100 com
 * os fatores que o compõem". Só o perfil Patrimônio o vê; quem decide isso é o
 * `buildOverviewHealth`, não este componente.
 *
 * Apresentação pura: recebe o índice já calculado pela análise automática. Não
 * recalcula nada — um segundo cálculo local divergiria do número que o resto do
 * app mostra para a mesma conta.
 */
@Component({
  selector: 'app-health-score-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TooltipComponent],
  templateUrl: './health-score-card.component.html',
  styleUrl: './health-score-card.component.scss'
})
export class HealthScoreCardComponent {
  readonly health = input.required<OverviewHealth>();

  readonly tooltip = TOOLTIP;

  readonly fatores = computed(() =>
    this.health().fatores.map((fator) => ({
      rotulo: fator.rotulo,
      explicacao: fator.explicacao,
      tone: FACTOR_TONE[fator.status],
      severidade: FACTOR_LABEL[fator.status]
    }))
  );
}
