import { StatusBadgeTone } from '../shared/status-badge/status-badge.component';
import { UsageBarTone } from '../shared/usage-bar/usage-bar.component';

/**
 * Derivações puras do histórico mensal (snapshots). Mapeia o risco real
 * (classificação + score 0–100) para tons visuais. Não inventa dados.
 */

export type RiskLevel = 'low' | 'moderate' | 'high';

export function riskLevel(classification: string | null | undefined, score: number): RiskLevel {
  const normalized = (classification || '').toLowerCase();
  if (normalized.includes('crít') || normalized.includes('crit') || normalized.includes('alt')) return 'high';
  if (normalized.includes('moder') || normalized.includes('aten') || normalized.includes('médio') || normalized.includes('medio')) return 'moderate';
  if (normalized.includes('baix')) return 'low';
  const value = Number(score || 0);
  if (value > 66) return 'high';
  if (value > 33) return 'moderate';
  return 'low';
}

export function riskBadgeTone(level: RiskLevel): StatusBadgeTone {
  if (level === 'high') return 'danger';
  if (level === 'moderate') return 'warning';
  return 'success';
}

export function riskUsageTone(level: RiskLevel): UsageBarTone {
  if (level === 'high') return 'critical';
  if (level === 'moderate') return 'warning';
  return 'ok';
}
