import type { SiteCard } from '../shared/site-card-grid/site-card-grid.component';
import type { CompareRow } from '../shared/site-compare-table/site-compare-table.component';
import type { SiteFaqItem } from '../shared/site-faq/site-faq.component';
import type { SiteNavLink } from '../shared/site-header/site-header.component';

/**
 * Conteúdo da página de planos.
 *
 * Preservado do `pricing.component.ts` anterior — a progressão comercial, o
 * comparativo e o FAQ foram escritos para esta página e continuam válidos.
 * Só a apresentação mudou.
 *
 * Nome, preço, features e limites dos planos não estão aqui: vêm de
 * `marketing-plans.ts`.
 */

export const PLANOS_NAV: readonly SiteNavLink[] = [
  { label: 'Planos', anchor: 'planos' },
  { label: 'Progressão', anchor: 'progressao' },
  { label: 'Comparar', anchor: 'comparar' },
  { label: 'Dúvidas', anchor: 'faq' },
  { label: 'O produto', route: '/produto' },
];

export const PLANOS_HERO = {
  eyebrow: 'Planos',
  title: 'Comece com clareza, pague por previsibilidade, evolua para patrimônio',
  description:
    'O Essencial tira você do improviso. O Controle organiza o mês com menos surpresa e menos retrabalho. O Patrimônio conecta a rotina financeira com crescimento e visão de longo prazo.',
  hint: 'Mensal para reduzir fricção na decisão',
  hintNote: 'Entre no plano certo com menor compromisso inicial e ajuste depois se precisar.',
} as const;

export const PLANOS_PROGRESSAO = {
  eyebrow: 'Progressão',
  title: 'A lógica comercial dos planos precisa ser óbvia',
  description:
    'A venda funciona melhor quando o usuário entende em que etapa está e qual o próximo passo natural.',
  steps: [
    {
      badge: '01',
      title: 'Começar',
      text: 'Use o Essencial para sair do improviso e validar a rotina sem custo.',
    },
    {
      badge: '02',
      title: 'Prever',
      text: 'Suba para Controle quando cartão, vencimentos e saldo real passarem a pesar no seu mês.',
    },
    {
      badge: '03',
      title: 'Evoluir',
      text: 'Vá para Patrimônio quando a sua rotina já estiver madura e a meta virar crescimento financeiro.',
    },
  ] satisfies readonly SiteCard[],
} as const;

export const PLANOS_COMPARATIVO: readonly CompareRow[] = [
  {
    feature: 'Resultado principal',
    availability: [
      'Começar a organizar',
      'Operar o mês com previsibilidade',
      'Acompanhar patrimônio e evolução',
    ],
  },
  { feature: 'Receitas, despesas e metas', availability: [true, true, true] },
  { feature: 'Cartões e fechamento por competência', availability: [false, true, true] },
  { feature: 'Importação de fatura em PDF', availability: [false, true, true] },
  { feature: 'Contas, saldo real e transferências', availability: [false, true, true] },
  { feature: 'Investimentos e patrimônio', availability: [false, false, true] },
];

export const PLANOS_FAQ: readonly SiteFaqItem[] = [
  {
    question: 'Posso começar no Essencial e subir depois?',
    answer: 'Sim. O upgrade é feito na sua assinatura sem perder o histórico já cadastrado.',
  },
  {
    question: 'Qual plano atende quem usa cartão todo mês?',
    answer:
      'O Controle foi desenhado para esse caso: cartões, fatura por competência e importação de PDF.',
  },
  {
    question: 'Quando vale ir para Patrimônio?',
    answer:
      'Quando você já controla o mês e quer consolidar investimentos e patrimônio no mesmo painel.',
  },
  {
    question: 'Qual plano é mais indicado para a maioria dos usuários pagantes?',
    answer:
      'Controle. Ele resolve a dor mais comum de quem usa cartão, precisa prever vencimentos e quer saber o que sobra no fim do mês.',
  },
];

export const PLANOS_GARANTIAS: readonly SiteCard[] = [
  {
    title: 'Troque de plano quando quiser',
    text: 'A mudança vale no ciclo seguinte. Sem multa por descer de plano.',
  },
  {
    title: 'Nada é cobrado no gratuito',
    text: 'O Essencial não pede cartão de crédito e não expira.',
  },
  {
    title: 'Os dados são seus em qualquer plano',
    text: 'Exportação liberada até se você cancelar a assinatura.',
  },
];

export const PLANOS_NOTA =
  'Todos os planos incluem acesso web e mobile. Troque ou cancele quando quiser, sem multa.';
