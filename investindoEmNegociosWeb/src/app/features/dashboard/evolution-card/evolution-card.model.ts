import { hasAtLeastRole, UserRole } from '../../../core/roles';

/** Um mês da série. `netWorth` só existe nos perfis que veem patrimônio. */
export interface EvolutionMonth {
  label: string;
  income: number;
  expense: number;
  netWorth: number | null;
}

export interface EvolutionInput {
  months: EvolutionMonth[];
  /** Sobra do período: receitas recebidas menos despesas do mês corrente. */
  sobra: number;
  /** Variação percentual do patrimônio no período. `null` quando não dá para calcular. */
  patrimonioDeltaPct: number | null;
}

export interface EvolutionTag {
  text: string;
  tone: 'neutral' | 'success' | 'danger';
}

export interface EvolutionSeriesSpec {
  label: string;
  color: string;
  values: number[];
  emphasis?: boolean;
  /** Patrimônio anda em centenas de milhares; fluxo, em dezenas. Escalas separadas. */
  axis?: 'primary' | 'secondary';
}

export interface EvolutionView {
  title: string;
  subtitle: string;
  tooltip: string;
  /** Valor grande à direita do cabeçalho. */
  value: number;
  tag: EvolutionTag;
  series: EvolutionSeriesSpec[];
  labels: string[];
  note: string;
}

/**
 * O gráfico responde a pergunta do perfil, e por isso muda de nome com ele
 * (TELAS.md §1 e PERFIS_E_PERMISSOES.md):
 *
 * - **Essencial e Controle** — "Receitas e despesas": entrou × saiu, e o valor
 *   em destaque é a sobra do mês.
 * - **Patrimônio** — "Patrimônio": a mesma dupla mais a linha de patrimônio
 *   líquido em destaque, e o valor passa a ser a variação do período.
 *
 * A janela também muda: 6 meses no Controle, 12 no Patrimônio. Quem monta a
 * série é o container; aqui só se decide o que ela significa.
 */
export function buildEvolutionView(input: EvolutionInput, role: UserRole | null): EvolutionView {
  const patrimonio = hasAtLeastRole(role, 'Advanced');
  const labels = input.months.map((m) => m.label);

  const series: EvolutionSeriesSpec[] = [];

  if (patrimonio && input.months.some((m) => m.netWorth !== null)) {
    series.push({
      label: 'Patrimônio',
      color: 'var(--brand-navy-soft)',
      values: input.months.map((m) => m.netWorth ?? 0),
      emphasis: true,
      axis: 'secondary'
    });
  }

  series.push(
    { label: 'Receitas', color: 'var(--income)', values: input.months.map((m) => m.income) },
    { label: 'Despesas', color: 'var(--expense)', values: input.months.map((m) => m.expense) }
  );

  const meses = input.months.length;

  return {
    title: patrimonio ? 'Patrimônio' : 'Receitas e despesas',
    subtitle: `Últimos ${meses} meses`,
    tooltip: patrimonio
      ? 'Evolução do patrimônio líquido mês a mês, com as linhas de receita e despesa por baixo para mostrar o que produziu cada movimento. Clique na legenda para isolar uma série.'
      : 'Quanto entrou e quanto saiu em cada mês do período. A distância entre as duas linhas é a sobra daquele mês. Clique na legenda para isolar uma série.',
    value: patrimonio && input.patrimonioDeltaPct !== null ? lastNetWorth(input) : input.sobra,
    tag: buildTag(input, patrimonio),
    series,
    labels,
    note: patrimonio ? 'Patrimônio, entrada e saída de cada mês.' : 'Entrada e saída de cada mês.'
  };
}

/**
 * Rótulo do eixo: a faixa que a série percorre. Sem ele, três linhas de grade
 * sem número não dizem se a variação foi de mil ou de cem mil reais.
 */
export function buildEvolutionAxisNote(
  input: EvolutionInput,
  role: UserRole | null,
  fmt: (value: number) => string
): string {
  const view = buildEvolutionView(input, role);
  // Só o fluxo: quando há duas faixas, o patrimônio é descrito pelos ticks da
  // faixa de cima, e repeti-lo aqui daria dois intervalos para a mesma legenda.
  const fluxo = view.series.filter((s) => s.axis !== 'secondary').flatMap((s) => s.values);
  if (!fluxo.length) {
    return '';
  }
  const min = Math.min(...fluxo, 0);
  const max = Math.max(...fluxo, 0);
  return `Fluxo mensal · ${fmt(min)} a ${fmt(max)}`;
}

function lastNetWorth(input: EvolutionInput): number {
  for (let i = input.months.length - 1; i >= 0; i--) {
    const value = input.months[i].netWorth;
    if (value !== null) {
      return value;
    }
  }
  return 0;
}

function buildTag(input: EvolutionInput, patrimonio: boolean): EvolutionTag {
  if (patrimonio && input.patrimonioDeltaPct !== null) {
    const up = input.patrimonioDeltaPct >= 0;
    return {
      text: `${up ? '↑' : '↓'} ${formatPercent(Math.abs(input.patrimonioDeltaPct))}`,
      tone: up ? 'success' : 'danger'
    };
  }
  // Sobra negativa não vira pílula neutra: o mês fechou no vermelho e o card
  // precisa dizer isso sem que a pessoa compare os dois números de cabeça.
  return { text: 'sobra do mês', tone: input.sobra < 0 ? 'danger' : 'neutral' };
}

function formatPercent(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return `${rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1).replace('.', ',')}%`;
}
