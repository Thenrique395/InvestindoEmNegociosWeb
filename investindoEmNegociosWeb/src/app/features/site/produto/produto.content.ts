import type { SiteCard } from '../shared/site-card-grid/site-card-grid.component';
import type { SiteNavLink } from '../shared/site-header/site-header.component';

/**
 * Conteúdo do tour do produto (`/produto`).
 *
 * Texto copiado de `prototipos/Site - estilo produto.dc.html`.
 *
 * Os planos não estão aqui: vêm de `marketing-plans.ts`, como na landing. Só a
 * matriz de comparação é própria desta página — ela não existe no modelo.
 */

export const PRODUTO_NAV: readonly SiteNavLink[] = [
  { label: 'Painel', anchor: 'painel' },
  { label: 'Cartões', anchor: 'cartoes' },
  { label: 'Metas', anchor: 'metas' },
  { label: 'No celular', anchor: 'celular' },
  { label: 'Planos', anchor: 'planos' },
];

export const PRODUTO_HERO = {
  title: 'Seu mês inteiro.',
  titleAccent: 'Numa tela só.',
  description: 'Abra e saiba o que sobra.',
  primaryCta: 'Começar de graça',
  secondaryCta: 'Ver o painel',
} as const;

/** Os três degraus do cálculo de saldo disponível. */
export const PRODUTO_SALDO = {
  title: 'Nada de somar na mão.',
  description: 'O saldo já vem descontado do que ainda vai vencer.',
  steps: [
    {
      label: 'O extrato mostra',
      value: 'R$ 14.902,00',
      note: 'A soma bruta das suas contas.',
      tone: 'muted' as const,
    },
    {
      label: 'Menos o que já tem dono',
      value: '− R$ 2.421,65',
      note: 'Fatura, parcelas e contas em aberto.',
      tone: 'expense' as const,
    },
    {
      label: 'Você pode usar',
      value: 'R$ 12.480,35',
      note: 'É esse o número que o painel mostra.',
      tone: 'income' as const,
    },
  ],
} as const;

export const PRODUTO_PERGUNTAS: readonly SiteCard[] = [
  {
    title: 'Quanto eu tenho?',
    text: 'O dashboard abre com saldo, entradas, saídas e o que ainda vai vencer — tudo já calculado.',
  },
  {
    title: 'A fatura fecha quando?',
    text: 'Cada compra cai no mês de competência certo. Parcelamento vira lançamento automático.',
  },
  {
    title: 'Vou bater a meta?',
    text: 'A meta compara seu ritmo com o prazo e diz quanto falta por mês para chegar lá.',
  },
  {
    title: 'O que vence essa semana?',
    text: 'O calendário marca vencimentos e recebimentos, e destaca os próximos sete dias.',
  },
  {
    title: 'Passei do orçamento?',
    text: 'Planejado contra realizado por categoria, com aviso claro quando uma delas estoura.',
  },
  {
    title: 'Meu patrimônio cresceu?',
    text: 'Posições, proventos e evolução do patrimônio no mesmo painel do fluxo do mês.',
  },
];

export const PRODUTO_CARTOES = {
  title: 'Cartões.',
  titleAccent: 'No mês certo.',
  description: 'Compra parcelada vira 12 lançamentos. Você não faz essa conta.',
  card: {
    brand: 'Nubank',
    digits: '•••• 4821',
    invoiceLabel: 'Fatura de agosto',
    invoiceValue: 'R$ 1.842,10',
    dueBadge: 'vence 05/08',
    limitLabel: 'Limite utilizado',
    limitValue: 'R$ 4.842 / 18.000',
    limitPercent: 27,
    purchase: 'Notebook Dell',
    purchaseNote: '3/12 · R$ 641,58',
  },
} as const;

export const PRODUTO_METAS = {
  title: 'A meta sabe se você está no ritmo.',
  description: 'E quanto falta por mês para chegar no prazo.',
  goals: [
    {
      name: 'Reserva de emergência',
      status: 'No ritmo',
      onTrack: true,
      value: 'R$ 32.000',
      target: 'de R$ 48.000',
      percent: 67,
      note: '67% concluído · faltam R$ 16.000',
    },
    {
      name: 'Viagem 2027',
      status: 'Fora do ritmo',
      onTrack: false,
      value: 'R$ 6.400',
      target: 'de R$ 20.000',
      percent: 32,
      note: 'R$ 1.130/mês para chegar no prazo',
    },
  ],
} as const;

export const PRODUTO_CELULAR = {
  title: 'No bolso,',
  titleAccent: 'na hora.',
  description: 'Lançar uma despesa leva menos tempo do que guardar o comprovante.',
  cta: 'Quero fazer parte',
  listTitle: 'Total de agosto',
  listTotal: 'R$ 9.842,17',
  items: [
    { name: 'Plano de saúde', value: 'R$ 892', meta: '01/08 · Saúde' },
    { name: 'Energia', value: 'R$ 318', meta: '10/08 · Moradia' },
    { name: 'Aluguel', value: 'R$ 2.400', meta: '05/08 · Moradia' },
  ],
  keypad: {
    eyebrow: 'Nova despesa',
    question: 'Quanto foi?',
    amount: 'R$ 318,42',
    cta: 'Continuar',
  },
} as const;

export const PRODUTO_ROTINA = {
  title: 'Feito para quem cuida do dinheiro todo dia.',
  reports: {
    eyebrow: 'Relatórios',
    title: 'Seis meses de uma vez',
    months: ['mar', 'abr', 'mai', 'jun', 'jul', 'ago'],
    /** Pares receita/despesa em percentual da altura do gráfico. */
    series: [
      { income: 78, expense: 42 },
      { income: 74, expense: 46 },
      { income: 88, expense: 52 },
      { income: 76, expense: 40 },
      { income: 84, expense: 48 },
      { income: 92, expense: 44 },
    ],
  },
  budget: {
    eyebrow: 'Orçamento',
    title: 'Avisa quando estoura',
    rows: [
      { label: 'Alimentação', percent: 118 },
      { label: 'Moradia', percent: 88 },
      { label: 'Transporte', percent: 64 },
    ],
  },
  highlight: {
    value: '3 min',
    text: 'é o tempo médio para deixar o primeiro mês configurado.',
  },
} as const;

export const PRODUTO_PLANOS = {
  title: 'Comece de graça.',
  description:
    'Os três planos usam o mesmo sistema. A diferença é o quanto da sua vida financeira você quer colocar dentro dele.',
  compareTitle: 'O que muda entre os planos',
} as const;

export interface CompareRow {
  feature: string;
  /** Na ordem: Essencial, Controle, Patrimônio. */
  availability: readonly [boolean, boolean, boolean];
}

export const PRODUTO_COMPARATIVO: readonly CompareRow[] = [
  { feature: 'Dashboard, receitas e despesas', availability: [true, true, true] },
  { feature: 'Metas e calendário financeiro', availability: [true, true, true] },
  { feature: 'Cartões e faturas por competência', availability: [false, true, true] },
  { feature: 'Importação de PDF da fatura', availability: [false, true, true] },
  { feature: 'Orçamento por categoria', availability: [false, true, true] },
  { feature: 'Investimentos e patrimônio', availability: [false, false, true] },
  { feature: 'Simulador de cenários', availability: [false, false, true] },
  { feature: 'Exportação dos seus dados', availability: [true, true, true] },
];

export const PRODUTO_GARANTIAS: readonly SiteCard[] = [
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
