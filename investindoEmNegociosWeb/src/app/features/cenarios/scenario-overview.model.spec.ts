import { ScenarioProjectionPoint } from '../../core/cenarios.service';
import {
  buildScenarioChartPoints,
  buildScenarioPointViews,
  impactSign,
  impactTone,
  scenarioPeriodLabel
} from './scenario-overview.model';

function point(base: number, scenario: number, date = '2026-07-10'): ScenarioProjectionPoint {
  return { date, baseClosingBalance: base, scenarioClosingBalance: scenario };
}

describe('scenario-overview.model', () => {
  it('define tom e sinal do impacto', () => {
    expect(impactTone(100)).toBe('positive');
    expect(impactTone(-100)).toBe('negative');
    expect(impactTone(0)).toBe('flat');
    expect(impactSign(50)).toBe('+');
    expect(impactSign(-50)).toBe('');
    expect(impactSign(0)).toBe('+');
  });

  it('monta pontos com diferença e tom, limitando a quantidade', () => {
    const views = buildScenarioPointViews([
      point(100, 120), // +20
      point(100, 90),  // -10
      point(100, 100)  // 0
    ], 2);

    expect(views.length).toBe(2);
    expect(views[0].difference).toBe(20);
    expect(views[0].tone).toBe('positive');
    expect(views[1].tone).toBe('negative');
  });

  it('lida com lista vazia/ausente', () => {
    expect(buildScenarioPointViews(null)).toEqual([]);
    expect(buildScenarioPointViews(undefined)).toEqual([]);
  });

  it('monta pontos do gráfico com escala compartilhada', () => {
    const chart = buildScenarioChartPoints([
      point(100, 120),
      point(150, 300)
    ]);

    expect(chart[0].basePercent).toBeCloseTo(33.33, 1);
    expect(chart[0].scenarioPercent).toBe(40);
    expect(chart[1].scenarioPercent).toBe(100);
  });

  it('traduz o rótulo do período', () => {
    expect(scenarioPeriodLabel('month')).toBe('Este mês');
    expect(scenarioPeriodLabel('quarter')).toBe('Próximos 3 meses');
    expect(scenarioPeriodLabel('semester')).toBe('Próximos 6 meses');
    expect(scenarioPeriodLabel('year')).toBe('Próximos 12 meses');
    expect(scenarioPeriodLabel('desconhecido')).toBe('Este mês');
  });
});
