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
  commercialSteps = [
    {
      title: 'Comecar',
      copy: 'Use o Essencial para sair do improviso e validar a rotina sem custo.'
    },
    {
      title: 'Prever',
      copy: 'Suba para Controle quando cartao, vencimentos e saldo real passarem a pesar no seu mes.'
    },
    {
      title: 'Evoluir',
      copy: 'Vá para Patrimonio quando a sua rotina ja estiver madura e a meta virar crescimento financeiro.'
    }
  ];
  comparisonRows = [
    {
      label: 'Resultado principal',
      values: ['Comecar a organizar', 'Operar o mes com previsibilidade', 'Acompanhar patrimonio e evolucao']
    },
    {
      label: 'Receitas, despesas e metas',
      values: ['Sim', 'Sim', 'Sim']
    },
    {
      label: 'Cartoes e fechamento por competencia',
      values: ['Nao', 'Sim', 'Sim']
    },
    {
      label: 'Importacao de fatura em PDF',
      values: ['Nao', 'Sim', 'Sim']
    },
    {
      label: 'Contas, saldo real e transferencias',
      values: ['Nao', 'Sim', 'Sim']
    },
    {
      label: 'Investimentos e patrimonio',
      values: ['Nao', 'Nao', 'Sim']
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
      question: 'Qual plano e mais indicado para a maioria dos usuarios pagantes?',
      answer: 'Controle. Ele resolve a dor mais comum de quem usa cartao, precisa prever vencimentos e quer saber o que sobra no fim do mes.'
    }
  ];

  selectCycle(cycle: MarketingBillingCycle): void {
    this.cycle = cycle;
  }

  yearlyEquivalent(plan: { yearlyPrice: number }): number {
    return plan.yearlyPrice / 12;
  }
}
