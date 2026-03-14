import { of, throwError } from 'rxjs';
import { MonthlySnapshotsComponent } from './monthly-snapshots.component';

describe('MonthlySnapshotsComponent', () => {
  function createComponent(overrides?: { snapshotsService?: any }) {
    const snapshotsService = overrides?.snapshotsService ?? {
      list: jasmine.createSpy().and.returnValue(of([
        {
          id: 's1',
          year: 2026,
          month: 3,
          snapshotLabel: '03/2026',
          realAvailableBalance: 2300,
          projectedBalance: 2600,
          pendingExpenses: 900,
          pendingIncomes: 200,
          totalDebt: 1800,
          netWorth: 6200,
          riskScore: 81,
          riskClassification: 'ok',
          primaryInsight: 'Mantenha a reserva',
          recommendations: ['Renegociar'],
          createdAt: '2026-03-14T10:00:00Z'
        }
      ])),
      generate: jasmine.createSpy().and.returnValue(of({
        id: 's2',
        year: 2026,
        month: 4,
        snapshotLabel: '04/2026',
        realAvailableBalance: 2400,
        projectedBalance: 2650,
        pendingExpenses: 850,
        pendingIncomes: 250,
        totalDebt: 1700,
        netWorth: 6400,
        riskScore: 84,
        riskClassification: 'ok',
        primaryInsight: 'Continue assim',
        recommendations: ['Aporte reserva'],
        createdAt: '2026-04-14T10:00:00Z'
      }))
    };

    return { component: new MonthlySnapshotsComponent(snapshotsService), snapshotsService };
  }

  it('deve carregar snapshots ao iniciar', () => {
    const ctx = createComponent();

    ctx.component.ngOnInit();

    expect(ctx.snapshotsService.list).toHaveBeenCalled();
    expect(ctx.component.snapshots).toHaveSize(1);
    expect(ctx.component.loading).toBeFalse();
  });

  it('deve gerar snapshot do mês atual e adicionar no topo', () => {
    jasmine.clock().install();
    jasmine.clock().mockDate(new Date('2026-04-20T12:00:00Z'));
    const ctx = createComponent();
    ctx.component.snapshots = [
      {
        id: 's1',
        year: 2026,
        month: 3,
        snapshotLabel: '03/2026',
        realAvailableBalance: 2300,
        projectedBalance: 2600,
        pendingExpenses: 900,
        pendingIncomes: 200,
        totalDebt: 1800,
        netWorth: 6200,
        riskScore: 81,
        riskClassification: 'ok',
        primaryInsight: 'Mantenha a reserva',
        recommendations: ['Renegociar'],
        createdAt: '2026-03-14T10:00:00Z'
      }
    ];

    ctx.component.generateCurrentMonth();

    expect(ctx.snapshotsService.generate).toHaveBeenCalledWith(2026, 4);
    expect(ctx.component.snapshots[0].id).toBe('s2');
    expect(ctx.component.generating).toBeFalse();
    jasmine.clock().uninstall();
  });

  it('deve exibir erro quando a geração falhar', () => {
    const snapshotsService = {
      list: jasmine.createSpy().and.returnValue(of([])),
      generate: jasmine.createSpy().and.returnValue(throwError(() => ({ error: { detail: 'Falha ao gerar' } })))
    };
    const ctx = createComponent({ snapshotsService });

    ctx.component.generateCurrentMonth();

    expect(ctx.component.error).toBe('Falha ao gerar');
    expect(ctx.component.generating).toBeFalse();
  });
});
