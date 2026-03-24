import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MARKETING_PLANS, MarketingBillingCycle } from '../marketing-plans';

@Component({
  selector: 'app-pricing',
  standalone: true,
  imports: [CommonModule, RouterLink, CurrencyPipe],
  templateUrl: './pricing.component.html',
  styleUrl: './pricing.component.scss'
})
export class PricingComponent {
  cycle: MarketingBillingCycle = 'Monthly';
  plans = MARKETING_PLANS;
  comparisonRows = [
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
    }
  ];

  selectCycle(cycle: MarketingBillingCycle): void {
    this.cycle = cycle;
  }

  yearlyEquivalent(plan: { yearlyPrice: number }): number {
    return plan.yearlyPrice / 12;
  }
}
