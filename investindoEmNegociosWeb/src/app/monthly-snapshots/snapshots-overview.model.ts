import { StatusBadgeTone } from '../shared/status-badge/status-badge.component';
import { UsageBarTone } from '../shared/usage-bar/usage-bar.component';

/**
 * Derivações puras do histórico mensal (snapshots). Mapeia o risco real
 * (classificação + score 0–100) para tons visuais. Não inventa dados.
 */

export type RiskLevel = 'low' | 'moderate' | 'high';

/**
 * `score` é um índice de SAÚDE, não de risco: o backend parte de 100 e desconta por
 * despesa vencida, receita atrasada, cobertura baixa e projeção negativa
 * (`RiskBotService.CalculateHealthScore`). Quanto maior, melhor. Os limiares abaixo são
 * os mesmos do `DetermineClassification`: <45 crítico, <70 atenção, senão saudável.
 */
const SCORE_CRITICO = 45;
const SCORE_ATENCAO = 70;

/** Valores que o backend emite hoje (`RiskBotService.DetermineClassification`). */
const CLASSIFICACAO_DA_API: Record<string, RiskLevel> = {
  critical: 'high',
  warning: 'moderate',
  healthy: 'low',
};

/** Rótulos em português, para classificação vinda traduzida. */
const CLASSIFICACAO_PT: ReadonlyArray<[RegExp, RiskLevel]> = [
  [/crít|crit|alto|elevad/, 'high'],
  [/moder|aten|médio|medio/, 'moderate'],
  [/baix|control|saud/, 'low'],
];

export function riskLevel(classification: string | null | undefined, score: number): RiskLevel {
  const normalized = (classification || '').trim().toLowerCase();

  // Igualdade exata antes de substring: 'healthy' contém 'alt' ("he-alt-hy") e era lido
  // como risco alto — o estado mais saudável aparecia em vermelho.
  const daApi = CLASSIFICACAO_DA_API[normalized];
  if (daApi) return daApi;

  for (const [padrao, nivel] of CLASSIFICACAO_PT) {
    if (padrao.test(normalized)) return nivel;
  }

  const value = Number(score || 0);
  if (value < SCORE_CRITICO) return 'high';
  if (value < SCORE_ATENCAO) return 'moderate';
  return 'low';
}

/**
 * O que a barra "Nível de risco" preenche. O score é saúde, então o risco é o que falta
 * para 100 — sem isto, a barra enchia 84% justamente para quem está mais saudável.
 */
export function riskPercent(score: number): number {
  const value = Number(score || 0);
  return Math.round(Math.min(100, Math.max(0, 100 - value)));
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
