import { ScenarioProjectionPoint, ScenarioSimulationResponse } from '../cenarios.service';

/**
 * Derivações puras do simulador de cenários. Não inventa dados: opera sobre a
 * resposta real da simulação (saldos base/cenário e pontos de projeção).
 */

export type ScenarioTone = 'positive' | 'negative' | 'flat';

export interface ScenarioPointView {
  point: ScenarioProjectionPoint;
  difference: number;
  tone: ScenarioTone;
}

export function impactTone(impactAmount: number): ScenarioTone {
  if (impactAmount > 0) return 'positive';
  if (impactAmount < 0) return 'negative';
  return 'flat';
}

export function impactSign(impactAmount: number): string {
  return impactAmount >= 0 ? '+' : '';
}

export function buildScenarioPointViews(
  points: ScenarioProjectionPoint[] | null | undefined,
  limit = 14
): ScenarioPointView[] {
  return (points || []).slice(0, Math.max(0, limit)).map((point) => {
    const difference = Number(point.scenarioClosingBalance || 0) - Number(point.baseClosingBalance || 0);
    return {
      point,
      difference,
      tone: difference > 0 ? 'positive' : difference < 0 ? 'negative' : 'flat'
    };
  });
}

/** Rótulo amigável do período simulado. */
export function scenarioPeriodLabel(period: string): string {
  switch (period) {
    case 'quarter': return 'Próximos 3 meses';
    case 'semester': return 'Próximos 6 meses';
    case 'year': return 'Próximos 12 meses';
    default: return 'Este mês';
  }
}

export function hasScenarioResult(result: ScenarioSimulationResponse | null): boolean {
  return !!result && Array.isArray(result.scenarioPoints);
}
