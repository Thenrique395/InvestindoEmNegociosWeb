export type MarketingBillingCycle = 'Monthly' | 'Yearly';

export interface MarketingPlan {
  code: string;
  name: string;
  audience: string;
  description: string;
  salesHeadline: string;
  salesSubheadline: string;
  monthlyPrice: number;
  yearlyPrice: number;
  recommended?: boolean;
  highlight: string;
  features: string[];
  limits: string[];
  /** Selo no topo do card na landing: GRÁTIS, MAIS ESCOLHIDO, COMPLETO. */
  tag: string;
  /** Rótulo do botão do card. Muda por plano, não é genérico. */
  ctaLabel: string;
}

export const MARKETING_PLANS: MarketingPlan[] = [
  {
    code: 'basic',
    name: 'Essencial',
    audience: 'Para quem quer sair do improviso',
    description: 'Organize receitas, despesas e metas sem depender de planilha.',
    salesHeadline: 'Organize seu mês sem custo e sem depender de planilha.',
    salesSubheadline: 'Entre rápido, valide a rotina e veja valor antes de pensar em upgrade.',
    monthlyPrice: 0,
    yearlyPrice: 0,
    highlight: 'Comece sem custo e crie a base da sua organização financeira.',
    features: [
      'Dashboard financeiro do mês',
      'Receitas, despesas e categorias',
      'Metas financeiras e onboarding guiado',
      'Calendário financeiro',
      'Calculadora financeira'
    ],
    limits: [
      'Sem gestão avançada de cartões',
      'Sem importação de fatura',
      'Sem módulo de investimentos'
    ],
    tag: 'GRÁTIS',
    ctaLabel: 'Começar de graça'
  },
  {
    code: 'intermediate',
    name: 'Controle',
    audience: 'Para quem já usa cartão e quer previsibilidade',
    description: 'Centralize cartões, contas e importação de fatura em uma rotina prática.',
    salesHeadline: 'Troque o improviso por previsibilidade no seu mês.',
    salesSubheadline: 'Ideal para quem usa cartão, lida com vencimentos e quer saber o que realmente sobra.',
    monthlyPrice: 29.9,
    yearlyPrice: 299,
    recommended: true,
    highlight: 'O plano mais equilibrado para operar o mês com menos surpresa e menos retrabalho.',
    features: [
      'Tudo do Essencial',
      'Cartões, faturas e fechamento por competência',
      'Importação e conciliação de PDF da fatura',
      'Contas, transferências e saldo real'
    ],
    limits: [
      'Ainda sem carteira de investimentos completa'
    ],
    tag: 'MAIS ESCOLHIDO',
    ctaLabel: 'Quero fazer parte'
  },
  {
    code: 'advanced',
    name: 'Patrimônio',
    audience: 'Para quem quer crescer com visão patrimonial',
    description: 'Some patrimônio, investimentos e comparativos ao controle financeiro do dia a dia.',
    salesHeadline: 'Transforme controle financeiro em visão patrimonial.',
    salesSubheadline: 'Para quem já domina o mês e quer acompanhar patrimônio, investimentos e evolução.',
    monthlyPrice: 59.9,
    yearlyPrice: 599,
    highlight: 'Visão completa para quem quer conectar rotina financeira com crescimento patrimonial.',
    features: [
      'Tudo do Controle',
      'Investimentos, benchmarks e posições',
      'Acompanhamento de patrimônio',
      'Fluxo financeiro e carteira no mesmo painel'
    ],
    limits: [
      'Integrações externas premium entram na próxima fase'
    ],
    tag: 'COMPLETO',
    ctaLabel: 'Assinar Patrimônio'
  }
];

export function findMarketingPlan(planCode: string | null | undefined): MarketingPlan {
  return MARKETING_PLANS.find((plan) => plan.code === planCode) ?? MARKETING_PLANS[1];
}
