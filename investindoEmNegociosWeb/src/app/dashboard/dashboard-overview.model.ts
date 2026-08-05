import { NetWorthHistoryPointResponse } from '../features/accounts/models/account.models';

/**
 * Derivações puras da seção "Evolução patrimonial" do dashboard.
 * Extraídas do componente para ficarem testáveis. Não inventam
 * dados: operam sobre o histórico real recebido da API.
 */

export function netWorthMax(points: NetWorthHistoryPointResponse[]): number {
  return (points || []).reduce((max, item) => Math.max(max, item.netWorth), 0) || 1;
}

export function netWorthMin(points: NetWorthHistoryPointResponse[]): number {
  if (!points || !points.length) return 0;
  return points.reduce((min, item) => Math.min(min, item.netWorth), points[0].netWorth);
}

export function netWorthDelta(points: NetWorthHistoryPointResponse[]): number {
  if (!points || points.length < 2) return 0;
  return points[points.length - 1].netWorth - points[0].netWorth;
}

/** Altura relativa (%) da barra no mini-gráfico patrimonial (18–100). */
export function netWorthScale(value: number, points: NetWorthHistoryPointResponse[]): number {
  const max = netWorthMax(points);
  const min = netWorthMin(points);
  if (max === min) return 100;
  return 18 + ((value - min) / (max - min)) * 82;
}
