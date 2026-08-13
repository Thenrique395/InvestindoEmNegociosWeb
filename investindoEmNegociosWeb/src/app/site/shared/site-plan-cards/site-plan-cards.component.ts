import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RevealDirective } from '../reveal.directive';
import { SiteCtaDirective } from '../site-cta.directive';
import { formatCurrencyValue } from '../../../utils/locale-utils';
import type { MarketingBillingCycle, MarketingPlan } from '../../../marketing-plans';

/**
 * Cards de plano do site.
 *
 * Consome `MARKETING_PLANS` por `@Input` — o componente não busca nada. Os
 * dados já existem em `marketing-plans.ts` e batem com o protótipo; duplicar
 * nome, preço ou feature aqui garantiria divergência na primeira alteração.
 *
 * O plano recomendado ganha borda azul e selo, e cresce 2px — no protótipo ele
 * é visivelmente o caminho sugerido, não apenas um card com badge.
 */
@Component({
  selector: 'app-site-plan-cards',
  imports: [RevealDirective, SiteCtaDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './site-plan-cards.component.html',
  styleUrl: './site-plan-cards.component.scss',
})
export class SitePlanCardsComponent {
  readonly plans = input.required<readonly MarketingPlan[]>();
  readonly cycle = input<MarketingBillingCycle>('Monthly');

  /**
   * Qual par de textos o card mostra. Os dois vêm do mesmo `MarketingPlan` —
   * muda a ênfase, não a fonte:
   *
   * `landing` → `salesHeadline` + `salesSubheadline` (promessa de venda)
   * `tour`    → `audience` + `highlight` (para quem é e o que entrega)
   *
   * O protótipo do tour usa textos com esse recorte. Duplicá-los aqui geraria
   * duas versões do mesmo plano para divergir na primeira alteração de preço.
   */
  readonly variant = input<'landing' | 'tour'>('landing');

  readonly planSelected = output<MarketingPlan>();

  headlineOf(plan: MarketingPlan): string {
    return this.variant() === 'tour' ? plan.audience : plan.salesHeadline;
  }

  subOf(plan: MarketingPlan): string {
    return this.variant() === 'tour' ? plan.highlight : plan.salesSubheadline;
  }

  /** Preço exibido: no ciclo anual mostramos o equivalente mensal. */
  priceOf(plan: MarketingPlan): number {
    if (this.cycle() === 'Monthly') return plan.monthlyPrice;
    return plan.yearlyPrice > 0 ? plan.yearlyPrice / 12 : 0;
  }

  /** Preço já formatado. Usa o formatador do app, que respeita as preferências. */
  priceLabelOf(plan: MarketingPlan): string {
    return this.money(this.priceOf(plan));
  }

  /** Linha de apoio sob o preço. */
  noteOf(plan: MarketingPlan): string {
    if (plan.monthlyPrice === 0) return 'Sem cartão de crédito';
    if (this.cycle() === 'Yearly') return `Cobrado ${this.money(plan.yearlyPrice)} por ano`;
    return `Ou ${this.money(plan.yearlyPrice)} no plano anual`;
  }

  private money(value: number): string {
    return formatCurrencyValue(value);
  }
}
