import { of, throwError } from 'rxjs';
import { CenariosComponent } from './cenarios.component';
import { ScenarioSimulationResponse } from '../cenarios.service';

function result(overrides: Partial<ScenarioSimulationResponse> = {}): ScenarioSimulationResponse {
  return {
    period: 'month',
    referenceDate: '2026-07-01',
    baseProjectedClosingBalance: 1000,
    scenarioProjectedClosingBalance: 1200,
    impactAmount: 200,
    monthlySavingsPotential: 300,
    basePoints: [],
    scenarioPoints: [
      { date: '2026-07-10', baseClosingBalance: 1000, scenarioClosingBalance: 1100 }
    ],
    ...overrides
  };
}

function createComponent(overrides?: { service?: any }) {
  const service = overrides?.service ?? {
    simulate: jasmine.createSpy('simulate').and.returnValue(of(result()))
  };
  const cdr = { markForCheck: jasmine.createSpy('markForCheck') } as any;
  const destroyRef = { onDestroy: () => {} } as any;
  return { component: new CenariosComponent(service, cdr, destroyRef), service };
}

describe('CenariosComponent', () => {
  it('simula e preenche o resultado', () => {
    const { component, service } = createComponent();

    component.simulate();

    expect(service.simulate).toHaveBeenCalledWith(jasmine.objectContaining({ period: 'month', referenceDate: null }));
    expect(component.result?.impactAmount).toBe(200);
    expect(component.loading).toBeFalse();
    expect(component.error).toBe('');
  });

  it('sinaliza erro quando a simulação falha', () => {
    const { component } = createComponent({
      service: { simulate: jasmine.createSpy().and.returnValue(throwError(() => ({ error: { detail: 'boom' } }))) }
    });

    component.simulate();

    expect(component.error).toBe('boom');
    expect(component.loading).toBeFalse();
  });

  it('deriva sinal, tendência e tom do impacto', () => {
    const { component } = createComponent();
    component.result = result({ impactAmount: 200 });
    expect(component.impactSign).toBe('+');
    expect(component.impactTrend).toBe('up');
    expect(component.scenarioTone).toBe('success');

    component.result = result({ impactAmount: -50 });
    expect(component.impactSign).toBe('');
    expect(component.impactTrend).toBe('down');
    expect(component.scenarioTone).toBe('danger');
  });

  it('expõe os pontos de projeção derivados', () => {
    const { component } = createComponent();
    component.result = result();

    expect(component.pointViews.length).toBe(1);
    expect(component.pointViews[0].difference).toBe(100);
    expect(component.pointViews[0].tone).toBe('positive');
  });

  it('atualiza o período pelo seletor', () => {
    const { component } = createComponent();

    component.setPeriod('year');

    expect(component.params.period).toBe('year');
  });
});
