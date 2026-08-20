import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TooltipComponent } from '../tooltip/tooltip.component';

export type TransactionSummaryTone = 'primary' | 'success' | 'warning' | 'info' | 'danger';

/**
 * Densidade do card.
 *
 * `compact` é para faixa com quatro ou mais indicadores de valor monetário longo, onde
 * o valor quebrava no meio em telas estreitas. Nasceu duplicado em Relatórios, Histórico
 * mensal e Calculadoras — o mesmo bloco de override copiado três vezes. Pela regra da
 * terceira feature (ARQUITETURA_ANGULAR.md §2), virou variante daqui.
 */
export type TransactionSummaryDensity = 'default' | 'compact';

/**
 * Card de resumo premium para as telas de Receitas e Despesas.
 * Mantém a mesma API do StatCard (tone/eyebrow/value/note/tooltip + slots
 * [stat-icon] e [stat-note]) porém com o visual compacto do dashboard.
 */
@Component({
  selector: 'app-transaction-summary-card',
  standalone: true,
  imports: [TooltipComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="tsc" [attr.data-tone]="tone()" [attr.data-density]="density()">
      <!-- Ícone e rótulo dividem a primeira linha; o valor começa na borda do
           card, não recuado atrás do ícone (COMPONENTES.md §3.1). -->
      <div class="tsc__head">
        <span class="tsc__icon" aria-hidden="true">
          <ng-content select="[stat-icon]"></ng-content>
        </span>
        <p class="tsc__eyebrow">{{ eyebrow() }}</p>
        @if (tooltipText()) {
          <app-tooltip
            class="tsc__tooltip"
            [label]="tooltipLabel() || ('Mais informações sobre ' + eyebrow())"
            [text]="tooltipText()"
            size="sm" />
        }
      </div>
      <p class="tsc__value">{{ value() }}</p>
      <p class="tsc__note">{{ note() }}<ng-content select="[stat-note]"></ng-content></p>
    </article>
  `,
  styles: [`
    :host { display: block; }

    .tsc {
      --tone: var(--primary);
      --tone-text: var(--primary-text);
      --tone-weak: var(--primary-tint);
      --tone-soft: var(--primary-tint);

      display: grid;
      align-content: start;
      /* Sem gap no grid: as distâncias do protótipo são 10px do rótulo para o
         valor e 6px do valor para a nota, e vêm da margem de cada um. */
      gap: 0;
      height: 100%;
      padding: var(--card-padding);
      border: 1px solid var(--border);
      border-radius: var(--radius-card);
      background: var(--surface);
    }

    .tsc[data-tone='success'] { --tone: var(--income); --tone-text: var(--income-text); --tone-weak: var(--income-tint); --tone-soft: var(--income-tint); }
    .tsc[data-tone='warning'] { --tone: var(--warning); --tone-text: var(--warning-text); --tone-weak: var(--warning-tint); --tone-soft: var(--warning-tint); }
    .tsc[data-tone='info'] { --tone: var(--primary); --tone-text: var(--primary-text); --tone-weak: var(--primary-tint); --tone-soft: var(--primary-tint); }
    .tsc[data-tone='danger'] { --tone: var(--expense); --tone-text: var(--expense-text); --tone-weak: var(--expense-tint); --tone-soft: var(--expense-tint); }

    .tsc__head {
      display: flex;
      align-items: center;
      gap: var(--space-3);
    }

    .tsc__icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      inline-size: 30px;
      block-size: 30px;
      flex: none;
      border: none;
      border-radius: var(--radius-sm);
      background: var(--tone-weak);
      color: var(--tone-text);
    }

    .tsc__icon ::ng-deep svg {
      inline-size: 16px;
      block-size: 16px;
    }

    .tsc__eyebrow {
      flex: 1;
      min-width: 0;
      margin: 0;
      color: var(--text-tertiary);
      font-size: var(--fs-caption);
      font-weight: var(--fw-bold);
      letter-spacing: 0.14em;
      line-height: var(--lh-tight);
      text-transform: uppercase;
    }

    /* Poppins 26px/600 com tracking negativo — o valor é o elemento que
       carrega o card (COMPONENTES.md §3.1). */
    .tsc__value {
      margin: var(--space-4) 0 0;
      color: var(--text);
      font-family: var(--font-display);
      font-size: var(--fs-kpi);
      font-weight: var(--fw-semibold);
      line-height: var(--lh-tight);
      letter-spacing: var(--ls-tighter);
      font-variant-numeric: tabular-nums;
      /* Valor não parte no meio: 'R$ 8.580,00' quebrando entre o milhar e os
         centavos vira dois números na tela. Quando não couber, a faixa usa
         density="compact", que é o degrau de tamanho previsto no handoff. */
      overflow-wrap: normal;
      word-break: keep-all;
    }

    .tsc__tooltip { flex: none; }

    .tsc__note {
      margin: var(--space-2) 0 0;
      color: var(--text-tertiary);
      font-size: var(--fs-meta);
      line-height: var(--lh-control);
    }

    /* ---- densidade compacta ------------------------------------------------
       Para faixa unida de 4+ indicadores, onde cada card fica estreito demais
       para o valor a 26px. É a distinção que o próprio handoff tokeniza:
       --fs-kpi (26px) é "faixa isolada", --fs-kpi-strip (20px) é "faixa unida
       de 5". Vale em toda largura, porque depende da contagem de cards e não
       da viewport. */
    .tsc[data-density='compact'] .tsc__value {
      font-size: var(--fs-kpi-strip);
      letter-spacing: var(--ls-tighter);
      white-space: nowrap;
    }

    /* Abaixo de 720px a faixa cai para duas colunas e o card fica ainda mais
       estreito: a densidade desce outro degrau. --fs-micro é literalmente o
       token de eyebrow. */
    @media (max-width: 720px) {
      .tsc[data-density='compact'] {
        gap: var(--space-5);
        padding: var(--space-6);
      }

      .tsc[data-density='compact'] .tsc__head { gap: var(--space-3); }

      .tsc[data-density='compact'] .tsc__icon {
        inline-size: 28px;
        block-size: 28px;
      }

      .tsc[data-density='compact'] .tsc__icon ::ng-deep svg {
        inline-size: 14px;
        block-size: 14px;
      }

      .tsc[data-density='compact'] .tsc__eyebrow { font-size: var(--fs-micro); }

      .tsc[data-density='compact'] .tsc__note { font-size: var(--fs-caption); }
    }
  `]
})
export class TransactionSummaryCardComponent {
  readonly tone = input<TransactionSummaryTone>('primary');
  readonly density = input<TransactionSummaryDensity>('default');
  readonly eyebrow = input.required<string>();
  readonly value = input.required<string>();
  readonly note = input<string>('');
  readonly tooltipText = input<string>('');
  readonly tooltipLabel = input<string>('');
}
