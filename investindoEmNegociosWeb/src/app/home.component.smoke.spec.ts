import { of } from 'rxjs';
import { HomeComponent } from './home.component';
import { NotificationItem } from './notifications.service';

function createComponent(): HomeComponent {
  return new HomeComponent(
    { expenses$: of([]), incomes$: of([]), cards$: of([]) } as any,
    { list: () => of([]) } as any,
    { debtTotal: () => of({ total: 0 }) } as any,
    { getStatus: () => of({ step: 0, completed: true }), updateStatus: () => of({}) } as any,
    { list: () => of([]), resolveDefaultAccountId: () => null } as any,
    { getRole: () => 'Basic' } as any,
    { getProfile: () => of(null) } as any,
    { list: () => of([]) } as any,
    { navigateByUrl: jasmine.createSpy() } as any
  );
}

describe('HomeComponent smoke', () => {
  it('deve consumir o insight mais recente e preencher dicas/breakdown', () => {
    const component = createComponent();
    const oldInsight: NotificationItem = {
      id: 'n1',
      title: 'Antigo',
      message: 'Dicas: A | B.',
      kind: 'CashflowInsight',
      createdAt: '2026-01-01T00:00:00Z',
      payload: { tips: ['old'], scoreBreakdown: ['old score'] }
    };
    const latestInsight: NotificationItem = {
      id: 'n2',
      title: 'Novo',
      message: 'msg',
      kind: 'CashflowInsight',
      createdAt: '2026-02-01T00:00:00Z',
      payload: { tips: ['revisar despesas', 'confirmar receita'], scoreBreakdown: ['Base: 100', '- 10 risco'] }
    };

    (component as any).consumeRobotInsight([oldInsight, latestInsight]);

    expect(component.robotInsightTips).toEqual(['revisar despesas', 'confirmar receita']);
    expect(component.robotScoreBreakdown).toEqual(['Base: 100', '- 10 risco']);
  });

  it('deve resetar dicas quando não houver CashflowInsight', () => {
    const component = createComponent();
    component.robotInsightTips = ['x'];
    component.robotScoreBreakdown = ['y'];

    (component as any).consumeRobotInsight([
      { id: 'n1', title: 'x', message: 'y', kind: 'ExpenseUpcoming', createdAt: '2026-02-01T00:00:00Z' }
    ] as NotificationItem[]);

    expect(component.robotInsightTips).toEqual([]);
    expect(component.robotScoreBreakdown).toEqual([]);
  });

  it('deve extrair dicas do texto quando payload não existir', () => {
    const component = createComponent();
    const insight: NotificationItem = {
      id: 'n1',
      title: 'Insight',
      message: 'Resumo. Dicas: Pagar hoje | Evitar compras | Confirmar recebimentos.',
      kind: 'CashflowInsight',
      createdAt: '2026-02-01T00:00:00Z'
    };

    (component as any).consumeRobotInsight([insight]);

    expect(component.robotInsightTips).toEqual(['Pagar hoje', 'Evitar compras', 'Confirmar recebimentos.']);
  });
});
