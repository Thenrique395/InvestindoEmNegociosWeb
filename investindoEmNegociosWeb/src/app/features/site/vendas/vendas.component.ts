import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Title, Meta } from '@angular/platform-browser';

import { MARKETING_PLANS, type MarketingBillingCycle, type MarketingPlan } from '../../../core/marketing-plans';
import { RevealDirective } from '../shared/reveal.directive';
import { SiteCtaDirective } from '../shared/site-cta.directive';
import { SiteHeaderComponent } from '../shared/site-header/site-header.component';
import { SiteFooterComponent } from '../shared/site-footer/site-footer.component';
import { SiteSectionComponent } from '../shared/site-section/site-section.component';
import { SiteCardGridComponent } from '../shared/site-card-grid/site-card-grid.component';
import { SiteStatStripComponent } from '../shared/site-stat-strip/site-stat-strip.component';
import { SiteFaqComponent } from '../shared/site-faq/site-faq.component';
import { SitePlanCardsComponent } from '../shared/site-plan-cards/site-plan-cards.component';
import { VendasPreviewComponent } from './components/vendas-preview/vendas-preview.component';
import {
  VENDAS_COMPARATIVO,
  VENDAS_DEPOIMENTO,
  VENDAS_FAQ,
  VENDAS_FECHAMENTO,
  VENDAS_FOOTER_COLUMNS,
  VENDAS_HERO,
  VENDAS_NAV,
  VENDAS_PASSOS,
  VENDAS_PERSONAS,
  VENDAS_PLANOS_NOTA,
  VENDAS_RECURSOS,
  VENDAS_SEGURANCA,
  VENDAS_STATS,
} from './vendas.content';

/**
 * Landing de vendas — rota `/`.
 *
 * Container: só orquestra. Todo o desenho está nos primitivos de `site/shared`
 * e todo o texto em `vendas.content.ts`. Os planos vêm de `marketing-plans.ts`.
 */
@Component({
  selector: 'app-vendas',
  imports: [
    RevealDirective,
    SiteCtaDirective,
    SiteHeaderComponent,
    SiteFooterComponent,
    SiteSectionComponent,
    SiteCardGridComponent,
    SiteStatStripComponent,
    SiteFaqComponent,
    SitePlanCardsComponent,
    VendasPreviewComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './vendas.component.html',
  styleUrl: './vendas.component.scss',
})
export class VendasComponent {
  private readonly router = inject(Router);

  readonly nav = VENDAS_NAV;
  readonly hero = VENDAS_HERO;
  readonly stats = VENDAS_STATS;
  readonly comparativo = VENDAS_COMPARATIVO;
  readonly passos = VENDAS_PASSOS;
  readonly recursos = VENDAS_RECURSOS;
  readonly personas = VENDAS_PERSONAS;
  readonly seguranca = VENDAS_SEGURANCA;
  readonly depoimento = VENDAS_DEPOIMENTO;
  readonly faq = VENDAS_FAQ;
  readonly fechamento = VENDAS_FECHAMENTO;
  readonly planosNota = VENDAS_PLANOS_NOTA;
  readonly footerColumns = VENDAS_FOOTER_COLUMNS;
  readonly plans = MARKETING_PLANS;

  private readonly _cycle = signal<MarketingBillingCycle>('Monthly');
  readonly cycle = this._cycle.asReadonly();

  constructor() {
    inject(Title).setTitle('Investindo em Negócios — controle financeiro com contexto');
    inject(Meta).updateTag({
      name: 'description',
      content: this.hero.description,
    });
  }

  setCycle(cycle: MarketingBillingCycle): void {
    this._cycle.set(cycle);
  }

  /** Rola até a âncora sem sujar a URL com o hash. */
  scrollTo(anchor: string, event: Event): void {
    event.preventDefault();
    document.getElementById(anchor)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  goToCheckout(plan: MarketingPlan): void {
    void this.router.navigate(['/register'], { queryParams: { plano: plan.code } });
  }
}
