export type MarketingBillingCycle = 'Monthly' | 'Yearly';

export interface MarketingPlan {
  code: string;
  name: string;
  audience: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  recommended?: boolean;
  highlight: string;
  features: string[];
  limits: string[];
}

export const MARKETING_PLANS: MarketingPlan[] = [
  {
    code: 'basic',
    name: 'Essencial',
    audience: 'Para quem quer sair do improviso',
    description: 'Organize receitas, despesas e metas sem depender de planilha.',
    monthlyPrice: 0,
    yearlyPrice: 0,
    highlight: 'Comece sem custo e valide a rotina financeira.',
    features: [
      'Dashboard financeiro do mês',
      'Receitas, despesas e categorias',
      'Metas financeiras e onboarding guiado',
      'Calculadora financeira'
    ],
    limits: [
      'Sem gestão avançada de cartões',
      'Sem importação de fatura',
      'Sem módulo de investimentos'
    ]
  },
  {
    code: 'intermediate',
    name: 'Controle',
    audience: 'Para quem já usa cartão e quer previsibilidade',
    description: 'Centralize cartões, contas e importação de fatura em uma rotina prática.',
    monthlyPrice: 29.9,
    yearlyPrice: 299,
    recommended: true,
    highlight: 'Plano mais equilibrado para organizar o mês com menos esforço manual.',
    features: [
      'Tudo do Essencial',
      'Cartões, faturas e fechamento por competência',
      'Importação e conciliação de PDF da fatura',
      'Contas, transferências e saldo real'
    ],
    limits: [
      'Ainda sem carteira de investimentos completa'
    ]
  },
  {
    code: 'advanced',
    name: 'Patrimônio',
    audience: 'Para quem quer crescer com visão patrimonial',
    description: 'Some patrimônio, investimentos e comparativos ao controle financeiro do dia a dia.',
    monthlyPrice: 59.9,
    yearlyPrice: 599,
    highlight: 'Visão completa para quem já saiu do caos e quer evoluir patrimônio.',
    features: [
      'Tudo do Controle',
      'Investimentos, benchmarks e posições',
      'Acompanhamento de patrimônio',
      'Fluxo financeiro e carteira no mesmo painel'
    ],
    limits: [
      'Integrações externas premium entram na próxima fase'
    ]
  }
];

export function findMarketingPlan(planCode: string | null | undefined): MarketingPlan {
  return MARKETING_PLANS.find((plan) => plan.code === planCode) ?? MARKETING_PLANS[1];
}
