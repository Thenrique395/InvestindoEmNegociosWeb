import { NetWorthHistoryPointResponse } from '../features/accounts/models/account.models';
import { UsageBarTone } from '../shared/usage-bar/usage-bar.component';

/**
 * Derivações puras das seções "Evolução patrimonial" e "Mapa de dívidas" do
 * dashboard. Extraídas do componente para ficarem testáveis. Não inventam
 * dados: operam sobre o histórico e o resumo de dívidas reais.
 */

export type DebtAccent = 'danger' | 'warning' | 'info';

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

export function debtBucketAccent(label: string): DebtAccent {
  const normalized = (label || '').toLowerCase();
  if (normalized.includes('atras')) return 'danger';
  if (normalized.includes('cart')) return 'warning';
  return 'info';
}

/** Traduz o acento do bucket de dívida para o tom da UsageBar. */
export function debtAccentTone(accent: DebtAccent): UsageBarTone {
  if (accent === 'danger') return 'critical';
  if (accent === 'warning') return 'warning';
  return 'ok';
}

/** Participação (%) do bucket no total da dívida (0–100). */
export function debtBucketPercent(amount: number, totalDebt: number): number {
  const total = Number(totalDebt || 0);
  if (total <= 0) return 0;
  return Math.max(0, Math.min(100, (Number(amount || 0) / total) * 100));
}
