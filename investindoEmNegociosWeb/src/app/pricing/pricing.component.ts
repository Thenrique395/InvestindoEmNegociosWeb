import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { MARKETING_PLANS, MarketingBillingCycle } from '../marketing-plans';
import { DEFAULT_META_DESCRIPTION, DEFAULT_TITLE } from '../seo-defaults';

@Component({
  selector: 'app-pricing',
  standalone: true,
  imports: [CommonModule, RouterLink, CurrencyPipe],
  templateUrl: './pricing.component.html',
  styleUrl: './pricing.component.scss'
})
export class PricingComponent implements OnInit, OnDestroy {
  cycle: MarketingBillingCycle = 'Monthly';
  plans = MARKETING_PLANS;
  readonly planIconVariants: Record<string, string> = {
    basic: 'plan-card__icon--info',
    intermediate: 'plan-card__icon--primary',
    advanced: 'plan-card__icon--success'
  };
  commercialSteps = [
    {
      title: 'Começar',
      copy: 'Use o Essencial para sair do improviso e validar a rotina sem custo.',
      icon: 'plan-card__icon--info'
    },
    {
      title: 'Prever',
      copy: 'Suba para Controle quando cartão, vencimentos e saldo real passarem a pesar no seu mês.',
      icon: 'plan-card__icon--primary'
    },
    {
      title: 'Evoluir',
      copy: 'Vá para Patrimônio quando a sua rotina já estiver madura e a meta virar crescimento financeiro.',
      icon: 'plan-card__icon--success'
    }
  ];
  comparisonRows = [
    {
      label: 'Resultado principal',
      values: ['Começar a organizar', 'Operar o mês com previsibilidade', 'Acompanhar patrimônio e evolução']
    },
    {
      label: 'Receitas, despesas e metas',
      values: ['Sim', 'Sim', 'Sim']
    },
    {
      label: 'Cartões e fechamento por competência',
      values: ['Não', 'Sim', 'Sim']
    },
    {
      label: 'Importação de fatura em PDF',
      values: ['Não', 'Sim', 'Sim']
    },
    {
      label: 'Contas, saldo real e transferências',
      values: ['Não', 'Sim', 'Sim']
    },
    {
      label: 'Investimentos e patrimônio',
      values: ['Não', 'Não', 'Sim']
    }
  ];
  faqs = [
    {
      question: 'Posso começar no Essencial e subir depois?',
      answer: 'Sim. O upgrade é feito na sua assinatura sem perder o histórico já cadastrado.'
    },
    {
      question: 'Qual plano atende quem usa cartão todo mês?',
      answer: 'O Controle foi desenhado para esse caso: cartões, fatura por competência e importação de PDF.'
    },
    {
      question: 'Quando vale ir para Patrimônio?',
      answer: 'Quando você já controla o mês e quer consolidar investimentos e patrimônio no mesmo painel.'
    },
    {
      question: 'Qual plano é mais indicado para a maioria dos usuários pagantes?',
      answer: 'Controle. Ele resolve a dor mais comum de quem usa cartão, precisa prever vencimentos e quer saber o que sobra no fim do mês.'
    }
  ];

  constructor(private readonly title: Title, private readonly meta: Meta) {}

  ngOnInit(): void {
    this.title.setTitle('Planos — Investindo em Negócios');
    this.meta.updateTag({
      name: 'description',
      content: 'Compare os planos Essencial, Controle e Patrimônio e escolha o ideal para sua rotina financeira. Comece grátis, sem cartão de crédito.'
    });
  }

  ngOnDestroy(): void {
    this.title.setTitle(DEFAULT_TITLE);
    this.meta.updateTag({ name: 'description', content: DEFAULT_META_DESCRIPTION });
  }

  get comparisonByPlan(): { name: string; recommended?: boolean; rows: { label: string; value: string }[] }[] {
    return this.plans.map((plan, planIndex) => ({
      name: plan.name,
      recommended: plan.recommended,
      rows: this.comparisonRows.map((row) => ({
        label: row.label,
        value: row.values[planIndex]
      }))
    }));
  }

  selectCycle(cycle: MarketingBillingCycle): void {
    this.cycle = cycle;
  }

  yearlyEquivalent(plan: { yearlyPrice: number }): number {
    return plan.yearlyPrice / 12;
  }
}
