import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type KpiTone = 'neutral' | 'income' | 'expense' | 'warning' | 'primary';

export interface KpiItem {
  label: string;
  value: string;
  note?: string;
  /** Obrigatório: indicador sem explicação do cálculo não passa em revisão. */
  tooltip: string;
  tone?: KpiTone;
  icon?: string;
}

/**
 * Faixa de indicadores — COMPONENTES.md §3.1(b).
 *
 * **`display:flex` com `flex-wrap`, nunca `grid` com `auto-fit`.** Grid deixa
 * célula vazia à direita quando a contagem não divide pelo número de colunas;
 * flex faz a última linha crescer e preencher (ARQUITETURA_ANGULAR.md §7).
 *
 * O divisor é `box-shadow`, não `border-right`: quando a faixa quebra em duas
 * linhas, a sombra desenha divisor à direita **e** abaixo, então não sobra
 * linha solta na borda nem falta divisor entre as linhas.
 *
 * `tooltip` é obrigatório no tipo — o handoff exige que todo indicador explique
 * como é calculado.
 */
@Component({
  selector: 'app-kpi-strip',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './kpi-strip.component.html',
  styleUrl: './kpi-strip.component.scss',
})
export class KpiStripComponent {
  readonly items = input.required<readonly KpiItem[]>();
  /** Destaca a primeira célula, como no dashboard. */
  readonly featureFirst = input(false);
}
