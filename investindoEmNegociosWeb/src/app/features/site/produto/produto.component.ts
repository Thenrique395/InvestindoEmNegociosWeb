import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Meta, Title } from '@angular/platform-browser';

import {
  MARKETING_PLANS,
  type MarketingBillingCycle,
  type MarketingPlan,
} from '../../../core/marketing-plans';
import { RevealDirective } from '../shared/reveal.directive';
import { SiteCtaDirective } from '../shared/site-cta.directive';
import { SiteHeaderComponent } from '../shared/site-header/site-header.component';
import { SiteFooterComponent } from '../shared/site-footer/site-footer.component';
import { SiteSectionComponent } from '../shared/site-section/site-section.component';
import { SiteCardGridComponent } from '../shared/site-card-grid/site-card-grid.component';
import { SitePlanCardsComponent } from '../shared/site-plan-cards/site-plan-cards.component';
import { SiteCompareTableComponent } from '../shared/site-compare-table/site-compare-table.component';
import { VENDAS_FOOTER_COLUMNS } from '../vendas/vendas.content';
import {
  PRODUTO_CARTOES,
  PRODUTO_CELULAR,
  PRODUTO_COMPARATIVO,
  PRODUTO_GARANTIAS,
  PRODUTO_HERO,
  PRODUTO_METAS,
  PRODUTO_NAV,
  PRODUTO_PERGUNTAS,
  PRODUTO_PLANOS,
  PRODUTO_ROTINA,
  PRODUTO_SALDO,
} from './produto.content';

/**
 * Tour do produto — rota `/produto`.
 *
 * Era a home até o redesign; a landing de conversão tomou a `/`. Aqui a
 * narrativa é o produto em si: faixas claras e navy alternadas, tipografia
 * grande e um recorte da interface por seção.
 */
@Component({
  selector: 'app-produto',
  imports: [
    RevealDirective,
    SiteCtaDirective,
    SiteHeaderComponent,
    SiteFooterComponent,
    SiteSectionComponent,
    SiteCardGridComponent,
    SitePlanCardsComponent,
    SiteCompareTableComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './produto.component.html',
  styleUrl: './produto.component.scss',
})
export class ProdutoComponent {
  private readonly router = inject(Router);

  readonly nav = PRODUTO_NAV;
  readonly hero = PRODUTO_HERO;
  readonly saldo = PRODUTO_SALDO;
  readonly perguntas = PRODUTO_PERGUNTAS;
  readonly cartoes = PRODUTO_CARTOES;
  readonly metas = PRODUTO_METAS;
  readonly celular = PRODUTO_CELULAR;
  readonly rotina = PRODUTO_ROTINA;
  readonly planosCopy = PRODUTO_PLANOS;
  readonly comparativo = PRODUTO_COMPARATIVO;
  readonly garantias = PRODUTO_GARANTIAS;
  readonly footerColumns = VENDAS_FOOTER_COLUMNS;
  readonly plans = MARKETING_PLANS;

  readonly planNames = MARKETING_PLANS.map((plan) => plan.name);
  readonly recommendedIndex = MARKETING_PLANS.findIndex((plan) => plan.recommended);

  private readonly _cycle = signal<MarketingBillingCycle>('Monthly');
  readonly cycle = this._cycle.asReadonly();

  constructor() {
    inject(Title).setTitle('O produto — Investindo em Negócios');
    inject(Meta).updateTag({
      name: 'description',
      content: 'Painel, cartões, metas e orçamento em uma tela só. Veja como o sistema funciona.',
    });
  }

  setCycle(cycle: MarketingBillingCycle): void {
    this._cycle.set(cycle);
  }

  scrollTo(anchor: string, event: Event): void {
    event.preventDefault();
    document.getElementById(anchor)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  goToCheckout(plan: MarketingPlan): void {
    void this.router.navigate(['/register'], { queryParams: { plano: plan.code } });
  }
}
