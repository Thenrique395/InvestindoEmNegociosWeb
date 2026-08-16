import { InvestmentPosition, InvestmentType } from '../investments.service';
import { isCurrentMonth, isProventoMovement, positionCurrentValue, positionNetContributed } from '../utils/investments.utils';

/**
 * Modelo puro da carteira de investimentos.
 *
 * Regra essencial: separar claramente aporte (investido) × valorização
 * (mercado − investido) × proventos. Nunca somar valorização como se fosse
 * contribuição do usuário. Sem cotação de mercado, o valor cai para o preço
 * médio (custo) — nunca inventa preço.
 *
 * Esta central é de gestão/registro/acompanhamento. Não produz recomendação
 * de compra/venda nem indicação de ativos.
 */

export const INVESTMENT_TYPE_LABELS: Record<InvestmentType, string> = {
  RF: 'Renda Fixa',
  ACOES: 'Ações',
  FUNDOS: 'Fundos',
  CRIPTO: 'Cripto',
  IMOVEL: 'Imóveis',
  VEICULO: 'Veículos'
};

const TYPE_COLORS: Record<InvestmentType, string> = {
  RF: 'var(--chart-1)',
  ACOES: 'var(--income)',
  FUNDOS: 'var(--chart-5)',
  CRIPTO: 'var(--chart-3)',
  IMOVEL: 'var(--chart-6)',
  VEICULO: 'var(--expense)'
};

export interface AllocationSlice {
  key: InvestmentType;
  label: string;
  value: number;
  percent: number;
  color: string;
}

export interface InvestmentsOverview {
  /** Valor atual de mercado (usa cotação quando há; senão, preço médio). */
  marketValue: number;
  /** Total efetivamente aportado (custo). */
  invested: number;
  /** Valorização = mercado − investido (pode ser negativa). */
  growth: number;
  /** Rentabilidade % sobre o investido. */
  profitPercent: number;
  /** Proventos registrados nos últimos 12 meses, sem somar a aporte/valorização. */
  proventos: number;
  aporteMonth: number;
  resgateMonth: number;
  resultMonth: number;
  activeCount: number;
  zeroedCount: number;
  distribution: AllocationSlice[];
}

export function positionMarketValue(pos: InvestmentPosition): number {
  return positionCurrentValue(pos);
}

export function positionInvested(pos: InvestmentPosition): number {
  return positionNetContributed(pos);
}

export function positionProfit(pos: InvestmentPosition): number {
  return positionMarketValue(pos) - positionInvested(pos);
}

export function positionProfitPercent(pos: InvestmentPosition): number {
  const invested = positionInvested(pos);
  if (invested <= 0) return 0;
  return (positionProfit(pos) / invested) * 100;
}

function monthMovementSum(positions: InvestmentPosition[], today: Date, types: string[]): number {
  return positions.reduce((sum, pos) => {
    const inMonth = (pos.movements || []).filter((m) => isCurrentMonth(m.date, today) && types.includes(m.type));
    return sum + inMonth.reduce((acc, m) => acc + (m.quantity || 0) * (m.price || 0), 0);
  }, 0);
}

function isWithinLastMonths(iso: string, today: Date, months: number): boolean {
  if (!iso) return false;
  const [datePart] = iso.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const date = year && month && day ? new Date(year, month - 1, day) : new Date(iso);
  if (Number.isNaN(date.getTime())) return false;
  const start = new Date(today.getFullYear(), today.getMonth() - (months - 1), 1);
  const end = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
  return date >= start && date <= end;
}

function proventosTotal12Months(positions: InvestmentPosition[], today: Date): number {
  return positions.reduce((sum, pos) => {
    const provs = (pos.movements || []).filter((m) => isProventoMovement(m.type) && isWithinLastMonths(m.date, today, 12));
    return sum + provs.reduce((acc, m) => acc + (m.quantity || 0) * (m.price || 0), 0);
  }, 0);
}

export function buildDistribution(positions: InvestmentPosition[]): AllocationSlice[] {
  const total = positions.reduce((sum, p) => sum + positionMarketValue(p), 0);
  const byType = new Map<InvestmentType, number>();
  for (const pos of positions) {
    const value = positionMarketValue(pos);
    if (value <= 0) continue;
    byType.set(pos.type, (byType.get(pos.type) || 0) + value);
  }
  return Array.from(byType.entries())
    .map(([key, value]) => ({
      key,
      label: INVESTMENT_TYPE_LABELS[key] ?? key,
      value,
      percent: total > 0 ? (value / total) * 100 : 0,
      color: TYPE_COLORS[key] ?? 'var(--chart-1)'
    }))
    .sort((a, b) => b.value - a.value);
}

export function buildInvestmentsOverview(positions: InvestmentPosition[], today: Date = new Date()): InvestmentsOverview {
  const list = positions || [];
  const marketValue = list.reduce((sum, p) => sum + positionMarketValue(p), 0);
  const invested = list.reduce((sum, p) => sum + positionInvested(p), 0);
  const growth = marketValue - invested;
  const aporteMonth = monthMovementSum(list, today, ['APORTE', 'COMPRA']);
  const resgateMonth = monthMovementSum(list, today, ['RESGATE', 'VENDA']);

  return {
    marketValue,
    invested,
    growth,
    profitPercent: invested > 0 ? (growth / invested) * 100 : 0,
    proventos: proventosTotal12Months(list, today),
    aporteMonth,
    resgateMonth,
    resultMonth: aporteMonth - resgateMonth,
    activeCount: list.filter((p) => p.quantity > 0).length,
    zeroedCount: list.filter((p) => p.quantity <= 0).length,
    distribution: buildDistribution(list)
  };
}
