import { ChangeDetectionStrategy, Component, TemplateRef, input } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TooltipComponent } from '../tooltip/tooltip.component';

export type KpiTone = 'primary' | 'success' | 'danger' | 'info' | 'warning' | 'neutral';

export interface KpiDelta {
  direction: 'up' | 'down';
  /** A variação é boa para o usuário? Despesa subindo não é. */
  favorable: boolean;
  text: string;
}

export interface KpiItem {
  /** Identifica a célula no `track` e no template de ícone. */
  key: string;
  label: string;
  /** Pergunta curta que a célula responde. Opcional. */
  question?: string;
  value: string;
  note?: string;
  /** Obrigatório: indicador sem explicação do cálculo não passa em revisão. */
  tooltip: string;
  tone?: KpiTone;
  delta?: KpiDelta | null;
  link?: { route: string; label?: string };
}

/**
 * Faixa de indicadores unida — COMPONENTES.md §3.1(b).
 *
 * É o formato (b) do handoff, usado em Investimentos, Calendário e Dashboard. O formato (a),
 * de cards soltos com gap (Metas, Contas, Orçamento, Cartões), é o
 * `app-transaction-summary-card` — os dois existem de propósito, e os tokens dizem qual é
 * qual: `--fs-kpi` 26px é "faixa isolada", `--fs-kpi-strip` 20px é "faixa unida de 5".
 *
 * **`display:flex` com `flex-wrap`, nunca `grid` com `auto-fit`.** Grid deixa célula vazia à
 * direita quando a contagem não divide pelo número de colunas; flex faz a última linha
 * crescer e preencher (ARQUITETURA_ANGULAR.md §7).
 *
 * O divisor é `box-shadow`, não `border-right`: quando a faixa quebra em duas linhas, a
 * sombra desenha divisor à direita **e** abaixo, então não sobra linha solta na borda nem
 * falta divisor entre as linhas.
 *
 * O ícone vem por `ng-template` com o `key` no contexto, porque é SVG inline por indicador —
 * uma string não daria conta, e o README do handoff pede Lucide inline.
 */
@Component({
  selector: 'app-kpi-strip',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgTemplateOutlet, RouterLink, TooltipComponent],
  templateUrl: './kpi-strip.component.html',
  styleUrl: './kpi-strip.component.scss',
})
export class KpiStripComponent {
  readonly items = input.required<readonly KpiItem[]>();
  /** Template do ícone, recebendo `key` no contexto implícito. */
  readonly iconTemplate = input<TemplateRef<{ $implicit: string }> | null>(null);
  /** Destaca a primeira célula, como no dashboard. */
  readonly featureFirst = input(false);
  /** Divide a nota em linhas neste separador. */
  readonly noteSeparator = input(' · ');

  notaEmLinhas(note: string | undefined): string[] {
    return note ? note.split(this.noteSeparator()) : [];
  }
}
