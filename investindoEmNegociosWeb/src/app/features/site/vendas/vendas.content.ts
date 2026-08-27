import type { SiteFooterColumn, SiteFooterLink } from '../shared/site-footer/site-footer.component';
import type { SiteNavLink } from '../shared/site-header/site-header.component';

/**
 * Conteúdo da landing de vendas.
 *
 * Texto copiado literalmente de `prototipos/Site - pagina de vendas -claro-.dc.html`.
 * Não reescrever: a copy foi aprovada junto com o design.
 *
 * Os planos NÃO estão aqui — vêm de `marketing-plans.ts`, que já é a fonte
 * única de nome, preço, features e limites, e já bate com o protótipo.
 */

export const VENDAS_NAV: readonly SiteNavLink[] = [
  { label: 'Recursos', anchor: 'recursos' },
  { label: 'Como funciona', anchor: 'como' },
  { label: 'Planos', anchor: 'planos' },
  { label: 'Segurança', anchor: 'seguranca' },
  { label: 'Dúvidas', anchor: 'faq' },
];

export const VENDAS_HERO = {
  badge: 'Investindo em Negócios',
  title: 'Saia da planilha e veja seu mês',
  titleAccent: 'com clareza',
  description:
    'Receitas, despesas, cartões e metas em um painel só. Abra e saiba o que entrou, o que ainda vence e quanto realmente sobra — sem somar nada na mão.',
  primaryCta: 'Quero fazer parte',
  secondaryCta: 'Ver como funciona',
  seals: [
    'Plano gratuito para sempre',
    'Sem conectar conta bancária',
    'Cancele quando quiser',
  ],
} as const;

export interface SiteStat {
  value: string;
  label: string;
  tone?: 'default' | 'income';
}

export const VENDAS_STATS: readonly SiteStat[] = [
  { value: '16', label: 'módulos no painel' },
  { value: '3 min', label: 'para o primeiro mês configurado' },
  { value: 'R$ 0', label: 'para começar e continuar', tone: 'income' },
  { value: '0', label: 'senhas de banco pedidas' },
];

export const VENDAS_COMPARATIVO = {
  eyebrow: 'Do improviso ao controle',
  title: 'Você reconhece esse mês?',
  antes: {
    title: 'Do jeito antigo',
    items: [
      'Você soma tudo na calculadora para saber se pode gastar.',
      'A fatura chega maior do que a memória dizia.',
      'A planilha quebra quando entra parcelamento.',
      'A meta de reserva fica para o mês que vem, sempre.',
    ],
  },
  depois: {
    title: 'Com o painel',
    items: [
      'O saldo disponível já vem descontado do que está comprometido.',
      'Cada compra do cartão cai no mês de competência certo.',
      'Parcelamento vira 12 lançamentos automáticos, não 12 linhas na mão.',
      'A meta mostra quanto falta por mês para chegar no prazo.',
    ],
  },
} as const;

export interface SiteCard {
  /** Numeração (passos) ou sigla (recursos). Vazio nos cards sem marcador. */
  badge?: string;
  title: string;
  text: string;
}

export const VENDAS_PASSOS: readonly SiteCard[] = [
  {
    badge: '1',
    title: 'Cadastre contas e cartões',
    text: 'Saldo inicial, limite, fechamento e vencimento. É o que faz o resto do sistema calcular sozinho.',
  },
  {
    badge: '2',
    title: 'Lance no seu ritmo',
    text: 'Receitas e despesas em segundos, com parcelamento e recorrência quando precisar. Ou importe o PDF da fatura.',
  },
  {
    badge: '3',
    title: 'Leia o mês em 30 segundos',
    text: 'O painel responde quanto tem, quanto entrou, quanto saiu e o que precisa da sua atenção hoje.',
  },
];

export const VENDAS_RECURSOS: readonly SiteCard[] = [
  {
    badge: 'DB',
    title: 'Dashboard do mês',
    text: 'Saldo disponível, entradas, saídas e o que está comprometido — já calculados quando você abre.',
  },
  {
    badge: 'CT',
    title: 'Cartões e faturas',
    text: 'Compras, parcelas e fechamento por competência. A fatura cai no mês certo sem você fazer essa conta.',
  },
  {
    badge: 'MT',
    title: 'Metas',
    text: 'Defina o objetivo e veja o progresso real, com quanto falta por mês para chegar no prazo.',
  },
  {
    badge: 'CL',
    title: 'Calendário financeiro',
    text: 'Vencimentos, recebimentos e pendências do mês em uma grade, com os próximos sete dias em destaque.',
  },
  {
    badge: 'OR',
    title: 'Orçamento',
    text: 'Planejado contra realizado por categoria, com aviso claro quando uma delas estoura.',
  },
  {
    badge: 'IN',
    title: 'Investimentos',
    text: 'Posições, proventos e evolução do patrimônio no mesmo painel do fluxo do mês.',
  },
];

export const VENDAS_PERSONAS: readonly SiteCard[] = [
  {
    title: 'Autônomo ou freelancer',
    text: 'Receita varia de mês a mês? Veja o que já entrou, o que falta receber e o que pode comprometer agora.',
  },
  {
    title: 'Quem quer sair das planilhas',
    text: 'Centralize contas, cartões e despesas em um lugar só, com saldo real sempre à vista.',
  },
  {
    title: 'Quem vive no cartão',
    text: 'Acompanhe fechamento, vencimento e parcelas de cada cartão sem surpresa na próxima fatura.',
  },
  {
    title: 'Quem quer crescer patrimônio',
    text: 'Depois que o mês está sob controle, conecte investimentos e acompanhe a evolução do patrimônio.',
  },
];

export const VENDAS_SEGURANCA = {
  eyebrow: 'Segurança e confiança',
  title: 'Seus dados, sob seu controle',
  description:
    'O sistema não pede senha de banco e não puxa nada sem você mandar. Você registra no seu ritmo e leva os dados embora quando quiser.',
  cards: [
    {
      title: 'Acesso protegido por login próprio',
      text: 'Sua conta é protegida por autenticação e senha — só você acessa seus dados.',
    },
    {
      title: 'Sem conectar sua conta bancária',
      text: 'Você registra as informações no seu ritmo, sem compartilhar senha de banco com terceiros.',
    },
    {
      title: 'Você decide o que ver',
      text: 'Oculte valores na tela quando quiser e controle o que cada visão mostra, do seu jeito.',
    },
    {
      title: 'Seus dados são seus',
      text: 'Exporte suas informações quando quiser — nada fica preso à plataforma.',
    },
  ] satisfies readonly SiteCard[],
} as const;

export const VENDAS_DEPOIMENTO = {
  eyebrow: 'Por que esse projeto existe',
  title: 'Construído para resolver um problema real: o meu',
  paragraphs: [
    'Passei anos tentando controlar as finanças em planilha. Funcionava até entrar parcelamento, fatura de cartão e receita variável — aí a conta parava de fechar e eu parava de olhar.',
    'O painel nasceu dessa frustração. Cada tela aqui responde uma pergunta que eu precisava responder todo mês, e nada além disso.',
  ],
  authorInitials: 'HS',
  authorName: 'Henrique Santos',
  authorRole: 'Investindo em Negócios',
} as const;

export interface SiteFaqItem {
  question: string;
  answer: string;
}

export const VENDAS_FAQ: readonly SiteFaqItem[] = [
  {
    question: 'Preciso conectar minha conta do banco?',
    answer:
      'Não. Você registra as informações no seu ritmo. Nenhuma senha de banco é pedida ou armazenada — e para cartão dá para importar o PDF da fatura em vez de digitar compra por compra.',
  },
  {
    question: 'O plano gratuito expira?',
    answer:
      'Não. O Essencial continua gratuito enquanto você quiser usá-lo, com dashboard, receitas, despesas, categorias, metas e calendário.',
  },
  {
    question: 'Funciona no celular?',
    answer:
      'Sim. Todas as telas têm versão mobile pensada para uso rápido: lista em cards, teclado numérico para lançar valor e atalho para as ações do dia.',
  },
  {
    question: 'E se eu quiser sair?',
    answer:
      'Você exporta seus dados quando quiser e pode excluir a conta pelas configurações. Nada fica preso à plataforma.',
  },
  {
    question: 'Dá para trocar de plano depois?',
    answer:
      'Sim, a qualquer momento. A troca vale no ciclo seguinte e não há multa por downgrade ou cancelamento.',
  },
];

export const VENDAS_FECHAMENTO = {
  eyebrow: 'Vamos começar',
  title: 'Seu próximo mês pode ser mais claro que o último.',
  description:
    'Comece pelo plano gratuito, cadastre uma conta e veja o painel montado antes do fim do café.',
  primaryCta: 'Quero fazer parte',
  secondaryCta: 'Ver os recursos',
} as const;

export const VENDAS_PLANOS_NOTA =
  'Todos os planos incluem acesso web e mobile. Troque ou cancele quando quiser, sem multa.';

export const VENDAS_FOOTER_COLUMNS: readonly SiteFooterColumn[] = [
  {
    title: 'Produto',
    links: [
      { label: 'Recursos', anchor: 'recursos' },
      { label: 'Planos', anchor: 'planos' },
      { label: 'Como funciona', anchor: 'como' },
    ] satisfies readonly SiteFooterLink[],
  },
  {
    title: 'Conteúdo',
    links: [
      { label: 'YouTube', href: 'https://www.youtube.com/@investindoemnegocios' },
      { label: 'Instagram', href: 'https://www.instagram.com/investindoemnegocios' },
      { label: 'Simulador', route: '/simulador' },
    ] satisfies readonly SiteFooterLink[],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Termos de uso', route: '/termos' },
      { label: 'Privacidade', route: '/privacidade' },
      { label: 'Segurança', anchor: 'seguranca' },
    ] satisfies readonly SiteFooterLink[],
  },
];
