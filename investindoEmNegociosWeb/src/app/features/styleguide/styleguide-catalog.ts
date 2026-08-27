export type StyleguideCategory = 'layout' | 'forms' | 'feedback' | 'overlay' | 'data' | 'pipe';

export interface StyleguideEntry {
  slug: string;
  name: string;
  selector: string;
  category: StyleguideCategory;
  description: string;
}

export const STYLEGUIDE_CATEGORY_LABELS: Record<StyleguideCategory, string> = {
  layout: 'Layout',
  forms: 'Formulários',
  feedback: 'Feedback',
  overlay: 'Overlay',
  data: 'Dados',
  pipe: 'Pipe'
};

export const STYLEGUIDE_COMPONENTS: StyleguideEntry[] = [
  {
    slug: 'segmented-selector',
    name: 'SegmentedSelector',
    selector: 'app-segmented-selector',
    category: 'forms',
    description: 'Alternador de visão. Trilho afundado, aba ativa branca com sombra de 1px.'
  },
  {
    slug: 'chart-line',
    name: 'ChartLine',
    selector: 'app-chart-line',
    category: 'data',
    description: 'Gráfico de linha com área em gradiente e série de comparação tracejada. Nenhuma feature escreve SVG.'
  },
  {
    slug: 'select-menu',
    name: 'SelectMenu',
    selector: 'app-select-menu',
    category: 'forms',
    description: 'Dropdown padrão. Todo campo de valor múltiplo usa este componente — chips em linha são proibidos.'
  },
  {
    slug: 'number-stepper',
    name: 'NumberStepper',
    selector: 'app-number-stepper',
    category: 'forms',
    description: 'Stepper numérico com campo digitável. Os botões são atalho, não a única entrada.'
  },
  {
    slug: 'kpi-strip',
    name: 'KpiStrip',
    selector: 'app-kpi-strip',
    category: 'data',
    description: 'Faixa de indicadores em flex com quebra. Cada item exige tooltip explicando o cálculo.'
  },
  {
    slug: 'progress-bar',
    name: 'ProgressBar',
    selector: 'app-progress-bar',
    category: 'data',
    description: 'Barra de progresso. A cor vem do modo: consumo (passar é ruim) ou conquista (chegar é bom).'
  },
  {
    slug: 'page-header',
    name: 'PageHeader',
    selector: 'app-page-header',
    category: 'layout',
    description: 'Cabeçalho padrão de página, com eyebrow, título, descrição e slots de ações/metadados.'
  },
  {
    slug: 'section-card',
    name: 'SectionCard',
    selector: 'app-section-card',
    category: 'layout',
    description: 'Card de seção com título, descrição e slot de ações de cabeçalho — agrupa blocos de conteúdo.'
  },
  {
    slug: 'filter-bar',
    name: 'FilterBar',
    selector: 'app-filter-bar',
    category: 'layout',
    description: 'Barra de filtros com slots à esquerda e à direita — busca, selects e ação principal de uma listagem.'
  },
  {
    slug: 'period-hero',
    name: 'PeriodHero',
    selector: 'app-period-hero',
    category: 'layout',
    description: 'Hero de página com navegação de mês anterior/próximo e slot para um card lateral (aside).'
  },
  {
    slug: 'period-total-card',
    name: 'PeriodTotalCard',
    selector: 'app-period-total-card',
    category: 'data',
    description: 'Card lateral de total do período (valor em destaque + descrição), usado ao lado do PeriodHero.'
  },
  {
    slug: 'responsive-list',
    name: 'ResponsiveList',
    selector: 'app-responsive-list',
    category: 'data',
    description: 'Tabela genérica orientada a coluna, com ordenação, seleção em lote (checkbox) e células projetadas via <ng-template appResponsiveListCell>. Generaliza o padrão antes duplicado em DespesasLista/ReceitasLista.'
  },
  {
    slug: 'comparison-pill',
    name: 'ComparisonPill',
    selector: 'app-comparison-pill',
    category: 'data',
    description: 'Pílula de comparação (ex.: "vs. mês anterior") com cor condicionada à direção boa/ruim da variação.'
  },
  {
    slug: 'status-badge',
    name: 'StatusBadge',
    selector: 'app-status-badge',
    category: 'feedback',
    description: 'Badge de status com tons semânticos (success/danger/warning/info/muted/default) e ponto opcional.'
  },
  {
    slug: 'ui-state',
    name: 'UiState',
    selector: 'app-ui-state',
    category: 'feedback',
    description: 'Bloco padrão de loading/erro/informação com ação de retry opcional.'
  },
  {
    slug: 'empty-state',
    name: 'EmptyState',
    selector: 'app-empty-state',
    category: 'feedback',
    description: 'Estado vazio padrão (ícone, título, descrição e CTA opcional) para listagens sem dados.'
  },
  {
    slug: 'billing-alert-banner',
    name: 'BillingAlertBanner',
    selector: 'app-billing-alert-banner',
    category: 'feedback',
    description: 'Banner de alerta de cobrança (pagamento em atraso, acesso encerrado, renovação próxima) — busca a assinatura atual via API, não é demonstrável isoladamente sem um usuário autenticado.'
  },
  {
    slug: 'tooltip',
    name: 'Tooltip',
    selector: 'app-tooltip',
    category: 'overlay',
    description: 'Botão "?" acessível que abre um painel de ajuda contextual ao clicar/focar.'
  },
  {
    slug: 'modal',
    name: 'Modal',
    selector: 'app-modal',
    category: 'overlay',
    description: 'Modal padrão com cabeçalho, corpo com scroll e rodapé de ações — tamanhos sm/md/lg/xl.'
  },
  {
    slug: 'form-field',
    name: 'FormField',
    selector: 'app-form-field',
    category: 'forms',
    description: 'Wrapper de label/hint/erro para inputs — padroniza validação visual e mensagens de campo.'
  },
  {
    slug: 'toggle-field',
    name: 'ToggleField',
    selector: 'app-toggle-field',
    category: 'forms',
    description: 'Card de toggle (switch) com label e descrição — usado para opções booleanas em formulários.'
  },
  {
    slug: 'account-list',
    name: 'AccountList',
    selector: 'app-account-list',
    category: 'data',
    description: 'Grade de cards de conta com saldo atual, tipo e ações. Componente de domínio — recebe AccountResponse[] do serviço de contas.'
  },
  {
    slug: 'cartoes-listagem',
    name: 'CartoesListagem',
    selector: 'app-cartoes-listagem',
    category: 'data',
    description: 'Grade de cards de cartão de crédito com bandeira, banco, limite e ciclo de fatura. Recebe StoredCard[] e CardBrandLookup[].'
  },
  {
    slug: 'app-currency-pipe',
    name: 'AppCurrencyPipe',
    selector: 'appCurrency',
    category: 'pipe',
    description: 'Pipe de formatação monetária com suporte a moeda alternativa e máscara de privacidade financeira.'
  }
];
