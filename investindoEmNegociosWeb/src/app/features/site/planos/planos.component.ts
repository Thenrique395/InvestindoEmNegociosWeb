import { ChangeDetectionStrategy, Component, OnDestroy, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Meta, Title } from '@angular/platform-browser';

import {
  MARKETING_PLANS,
  type MarketingBillingCycle,
  type MarketingPlan,
} from '../../../core/marketing-plans';
import { DEFAULT_META_DESCRIPTION, DEFAULT_TITLE } from '../../../core/seo-defaults';
import { RevealDirective } from '../shared/reveal.directive';
import { SiteCtaDirective } from '../shared/site-cta.directive';
import { SiteHeaderComponent } from '../shared/site-header/site-header.component';
import { SiteFooterComponent } from '../shared/site-footer/site-footer.component';
import { SiteSectionComponent } from '../shared/site-section/site-section.component';
import { SiteCardGridComponent } from '../shared/site-card-grid/site-card-grid.component';
import { SiteFaqComponent } from '../shared/site-faq/site-faq.component';
import { SitePlanCardsComponent } from '../shared/site-plan-cards/site-plan-cards.component';
import { SiteCompareTableComponent } from '../shared/site-compare-table/site-compare-table.component';
import { VENDAS_FOOTER_COLUMNS } from '../vendas/vendas.content';
import {
  PLANOS_COMPARATIVO,
  PLANOS_FAQ,
  PLANOS_GARANTIAS,
  PLANOS_HERO,
  PLANOS_NAV,
  PLANOS_NOTA,
  PLANOS_PROGRESSAO,
} from './planos.content';

/**
 * Página de planos — rota `/planos`.
 *
 * Substitui o `pricing.component`, preservando o conteúdo comercial que já
 * existia (progressão, comparativo e FAQ) e trocando só a apresentação pelos
 * primitivos do site.
 *
 * Mantém a restauração de título e meta no destroy, como a versão anterior:
 * sem isso, sair da página deixa o `<title>` de planos em toda rota seguinte.
 */
@Component({
  selector: 'app-planos',
  imports: [
    RouterLink,
    RevealDirective,
    SiteCtaDirective,
    SiteHeaderComponent,
    SiteFooterComponent,
    SiteSectionComponent,
    SiteCardGridComponent,
    SiteFaqComponent,
    SitePlanCardsComponent,
    SiteCompareTableComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './planos.component.html',
  styleUrl: './planos.component.scss',
})
export class PlanosComponent implements OnDestroy {
  private readonly router = inject(Router);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);

  readonly nav = PLANOS_NAV;
  readonly hero = PLANOS_HERO;
  readonly progressao = PLANOS_PROGRESSAO;
  readonly comparativo = PLANOS_COMPARATIVO;
  readonly faq = PLANOS_FAQ;
  readonly garantias = PLANOS_GARANTIAS;
  readonly nota = PLANOS_NOTA;
  readonly footerColumns = VENDAS_FOOTER_COLUMNS;
  readonly plans = MARKETING_PLANS;

  readonly planNames = MARKETING_PLANS.map((plan) => plan.name);
  readonly recommendedIndex = MARKETING_PLANS.findIndex((plan) => plan.recommended);

  private readonly _cycle = signal<MarketingBillingCycle>('Monthly');
  readonly cycle = this._cycle.asReadonly();

  constructor() {
    this.title.setTitle('Planos — Investindo em Negócios');
    this.meta.updateTag({
      name: 'description',
      content:
        'Compare os planos Essencial, Controle e Patrimônio e escolha o ideal para sua rotina financeira. Comece grátis, sem cartão de crédito.',
    });
  }

  ngOnDestroy(): void {
    this.title.setTitle(DEFAULT_TITLE);
    this.meta.updateTag({ name: 'description', content: DEFAULT_META_DESCRIPTION });
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
