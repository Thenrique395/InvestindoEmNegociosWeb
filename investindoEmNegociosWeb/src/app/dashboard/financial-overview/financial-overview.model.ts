import { hasAtLeastRole, UserRole } from '../../roles';
import { AiHealthStatus } from '../../financial-assistant.service';

export type OverviewPeriodo = 'month' | 'quarter' | 'year';

/**
 * Snapshot com os dados reais que o dashboard já calcula hoje.
 * `null` significa "sem dados" — nunca inventar valor no lugar.
 */
export interface FinancialOverviewInput {
  saldoPeriodo: number;
  saldoDisponivel: number;
  saldoEmContas: number;
  pendencias: number;
  saldoProjetado: number;
  receitas: { total: number; pendentes: number; anterior: number | null };
  despesas: { total: number; anterior: number | null };
  patrimonio: {
    liquido: number;
    ativos: number;
    passivos: number;
    investimentos: number;
    delta: number | null;
  };
  compromissos: {
    emAtraso: number;
    proximosSeteDias: number;
    valorEmAberto: number;
    dividaCartoes: number;
    temCartoes: boolean;
  };
  saude: { status: AiHealthStatus; resumo: string } | null;
}

export type OverviewCardId = 'saldo' | 'receitas' | 'despesas' | 'patrimonio' | 'saude' | 'compromissos';
export type OverviewTone = 'primary' | 'success' | 'danger' | 'info' | 'warning' | 'neutral';

export interface OverviewCardDelta {
  direction: 'up' | 'down';
  favorable: boolean;
  text: string;
}

export interface OverviewCard {
  id: OverviewCardId;
  tone: OverviewTone;
  title: string;
  question: string;
  value: string;
  delta: OverviewCardDelta | null;
  note: string;
  tooltip?: string;
  detailsRoute?: string;
  detailsLabel?: string;
}

export interface OverviewSummary {
  analytical: boolean;
  text: string;
}

export type CurrencyFormatter = (value: number) => string;

const PLAN_LABELS: Record<UserRole, string> = {
  Basic: 'Essencial',
  Intermediate: 'Inteligente',
  Advanced: 'Completo',
  Admin: 'Completo'
};

const DELTA_PERIOD_LABELS: Record<OverviewPeriodo, string> = {
  month: 'vs. mês anterior',
  quarter: 'vs. trimestre anterior',
  year: 'vs. ano anterior'
};

export function planoComercialLabel(role: UserRole | null): string {
  return PLAN_LABELS[role ?? 'Basic'];
}

export function buildOverviewCards(
  input: FinancialOverviewInput,
  role: UserRole | null,
  periodo: OverviewPeriodo,
  fmt: CurrencyFormatter
): OverviewCard[] {
  const intermediate = hasAtLeastRole(role, 'Intermediate');
  const deltaLabel = DELTA_PERIOD_LABELS[periodo];

  const cards: OverviewCard[] = [buildSaldoCard(input, intermediate, fmt)];

  if (intermediate) {
    cards.push(buildPatrimonioCard(input, fmt));
  }

  cards.push(
    buildReceitasCard(input, deltaLabel, fmt),
    buildDespesasCard(input, deltaLabel, fmt),
    buildCompromissosCard(input, fmt)
  );

  if (intermediate) {
    cards.push(buildSaudeCard(input));
  }

  return cards;
}

export function buildOverviewSummary(
  input: FinancialOverviewInput,
  role: UserRole | null,
  periodo: OverviewPeriodo
): OverviewSummary {
  if (!hasAtLeastRole(role, 'Intermediate')) {
    return { analytical: false, text: 'Seu resumo financeiro do período está pronto.' };
  }

  if (input.saude?.resumo) {
    return { analytical: true, text: input.saude.resumo };
  }

  const sentences: string[] = [];
  const periodoNome = periodo === 'month' ? 'mês' : periodo === 'quarter' ? 'trimestre' : 'ano';

  if (input.patrimonio.delta !== null && input.patrimonio.delta !== 0) {
    sentences.push(input.patrimonio.delta > 0 ? 'Seu patrimônio cresceu no período.' : 'Seu patrimônio recuou no período.');
  }

  const despesasPct = percentChange(input.despesas.total, input.despesas.anterior);
  if (despesasPct !== null && Math.abs(despesasPct) >= 5) {
    sentences.push(
      despesasPct < 0
        ? `Suas despesas caíram ${formatPercent(Math.abs(despesasPct))} em relação ao ${periodoNome} anterior.`
        : `Suas despesas subiram ${formatPercent(despesasPct)} em relação ao ${periodoNome} anterior.`
    );
  }

  if (sentences.length === 0) {
    return { analytical: false, text: 'Seu resumo financeiro do período está pronto.' };
  }

  return { analytical: true, text: sentences.slice(0, 2).join(' ') };
}

function buildSaldoCard(input: FinancialOverviewInput, intermediate: boolean, fmt: CurrencyFormatter): OverviewCard {
  if (!intermediate) {
    return {
      id: 'saldo',
      tone: 'primary',
      title: 'Saldo do período',
      question: 'Quanto sobrou até aqui?',
      value: fmt(input.saldoPeriodo),
      delta: null,
      note: 'Receitas recebidas menos despesas com vencimento no período.',
      tooltip: 'Saldo do período = saldo anterior acumulado mais receitas recebidas, menos despesas com vencimento no período selecionado.'
    };
  }

  return {
    id: 'saldo',
    tone: 'primary',
    title: 'Saldo disponível',
    question: 'Quanto você tem para usar?',
    value: fmt(input.saldoDisponivel),
    delta: null,
    note: `Em contas: ${fmt(input.saldoEmContas)} · Pendências: ${fmt(input.pendencias)} · Projetado: ${fmt(input.saldoProjetado)}`,
    tooltip: 'Saldo disponível real = saldo atual das contas ativas menos despesas ainda pendentes no período selecionado.',
    detailsRoute: '/contas',
    detailsLabel: 'Ver contas'
  };
}

function buildPatrimonioCard(input: FinancialOverviewInput, fmt: CurrencyFormatter): OverviewCard {
  const { patrimonio } = input;
  return {
    id: 'patrimonio',
    tone: 'info',
    title: 'Patrimônio líquido',
    question: 'Você está crescendo financeiramente?',
    value: fmt(patrimonio.liquido),
    delta:
      patrimonio.delta === null || patrimonio.delta === 0
        ? null
        : {
            direction: patrimonio.delta > 0 ? 'up' : 'down',
            favorable: patrimonio.delta > 0,
            text: `${patrimonio.delta > 0 ? '+' : '−'}${fmt(Math.abs(patrimonio.delta))} no período`
          },
    note: `Ativos: ${fmt(patrimonio.ativos)} · Passivos: ${fmt(patrimonio.passivos)} · Investimentos: ${fmt(patrimonio.investimentos)}`,
    tooltip: 'Patrimônio líquido = ativos consolidados em contas, investimentos e patrimônio manual menos obrigações em aberto.'
  };
}

function buildReceitasCard(input: FinancialOverviewInput, deltaLabel: string, fmt: CurrencyFormatter): OverviewCard {
  return {
    id: 'receitas',
    tone: 'success',
    title: 'Receitas',
    question: 'Quanto entrou neste período?',
    value: fmt(input.receitas.total),
    delta: buildPercentDelta(input.receitas.total, input.receitas.anterior, deltaLabel, 'upIsGood'),
    note: `Pendente a receber: ${fmt(input.receitas.pendentes)}`,
    tooltip: 'Total de receitas com status recebido no período selecionado.',
    detailsRoute: '/receitas',
    detailsLabel: 'Ver receitas'
  };
}

function buildDespesasCard(input: FinancialOverviewInput, deltaLabel: string, fmt: CurrencyFormatter): OverviewCard {
  return {
    id: 'despesas',
    tone: 'danger',
    title: 'Despesas',
    question: 'Quanto saiu neste período?',
    value: fmt(input.despesas.total),
    delta: buildPercentDelta(input.despesas.total, input.despesas.anterior, deltaLabel, 'downIsGood'),
    note: 'Despesas com vencimento no período, incluindo fixas, variáveis e contas.',
    tooltip: 'Total de despesas com vencimento no período selecionado.',
    detailsRoute: '/despesas',
    detailsLabel: 'Ver despesas'
  };
}

function buildCompromissosCard(input: FinancialOverviewInput, fmt: CurrencyFormatter): OverviewCard {
  const { compromissos } = input;
  const total = compromissos.emAtraso + compromissos.proximosSeteDias;
  const cartoesNote =
    compromissos.temCartoes && compromissos.dividaCartoes > 0
      ? ` · Fatura em cartões: ${fmt(compromissos.dividaCartoes)}`
      : '';

  if (total === 0) {
    return {
      id: 'compromissos',
      tone: 'success',
      title: 'Compromissos financeiros',
      question: 'Tem algo importante para pagar?',
      value: 'Tudo em dia',
      delta: null,
      note: `Nenhum compromisso crítico no período.${cartoesNote}`,
      detailsRoute: '/calendario',
      detailsLabel: 'Ver calendário'
    };
  }

  const partes: string[] = [];
  if (compromissos.emAtraso > 0) {
    partes.push(`${compromissos.emAtraso} em atraso`);
  }
  if (compromissos.proximosSeteDias > 0) {
    partes.push(`${compromissos.proximosSeteDias} nos próximos 7 dias`);
  }
  partes.push(`${fmt(compromissos.valorEmAberto)} em aberto`);

  return {
    id: 'compromissos',
    tone: compromissos.emAtraso > 0 ? 'danger' : 'warning',
    title: 'Compromissos financeiros',
    question: 'Tem algo importante para pagar?',
    value: `${total} ${total === 1 ? 'compromisso' : 'compromissos'}`,
    delta: null,
    note: `${partes.join(' · ')}${cartoesNote}`,
    detailsRoute: '/despesas',
    detailsLabel: 'Ver despesas'
  };
}

function buildSaudeCard(input: FinancialOverviewInput): OverviewCard {
  if (!input.saude) {
    return {
      id: 'saude',
      tone: 'neutral',
      title: 'Saúde financeira',
      question: 'Minha situação está boa?',
      value: 'Sem dados',
      delta: null,
      note: 'Dados insuficientes para calcular sua saúde financeira. Continue registrando movimentações para liberar a análise.'
    };
  }

  const statusMap: Record<AiHealthStatus, { label: string; tone: OverviewTone }> = {
    ok: { label: 'Estável', tone: 'success' },
    warning: { label: 'Atenção', tone: 'warning' },
    critical: { label: 'Crítico', tone: 'danger' }
  };
  const status = statusMap[input.saude.status] ?? { label: 'Estável', tone: 'success' as OverviewTone };

  return {
    id: 'saude',
    tone: status.tone,
    title: 'Saúde financeira',
    question: 'Minha situação está boa?',
    value: status.label,
    delta: null,
    note: input.saude.resumo,
    detailsRoute: '/assistente',
    detailsLabel: 'Ver análise'
  };
}

function buildPercentDelta(
  atual: number,
  anterior: number | null,
  deltaLabel: string,
  goodWhen: 'upIsGood' | 'downIsGood'
): OverviewCardDelta | null {
  const pct = percentChange(atual, anterior);
  if (pct === null || pct === 0) {
    return null;
  }

  const up = pct > 0;
  return {
    direction: up ? 'up' : 'down',
    favorable: goodWhen === 'upIsGood' ? up : !up,
    text: `${up ? '+' : '−'}${formatPercent(Math.abs(pct))} ${deltaLabel}`
  };
}

function percentChange(atual: number, anterior: number | null): number | null {
  if (anterior === null || anterior <= 0) {
    return null;
  }
  return ((atual - anterior) / anterior) * 100;
}

function formatPercent(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return `${rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1).replace('.', ',')}%`;
}
