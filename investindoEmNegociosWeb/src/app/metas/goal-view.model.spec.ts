import { Goal, GoalProgress } from '../goals.service';
import { buildGoalsSummary, buildGoalView, configFor, filterGoals } from './goal-view.model';

function goal(p: Partial<Goal> & { id: string; kind: Goal['kind'] }): Goal {
  return {
    title: 'Meta', targetAmount: 1000, currentAmount: 0, year: 2026,
    status: 'InProgress', createdAt: '', updatedAt: '', expectedMonthly: 0,
    ...p
  } as Goal;
}

describe('goal-view.model', () => {
  describe('config por tipo', () => {
    it('despesa é consumo com rótulos próprios', () => {
      const c = configFor('Expense');
      expect(c.isConsumption).toBeTrue();
      expect(c.realizedLabel).toBe('Gasto');
      expect(c.remainingLabel).toBe('Disponível');
    });
    it('receita é conquista', () => {
      expect(configFor('Income').isConsumption).toBeFalse();
      expect(configFor('Income').realizedLabel).toBe('Recebido');
    });
  });

  describe('buildGoalView com progresso do backend', () => {
    it('despesa acima do limite fica excedida com tom crítico', () => {
      const progress: GoalProgress = { goalId: '1', kind: 'Expense', mode: 'Limit', target: 1000, realized: 1100, pending: 0, percent: 110, remaining: 0, state: 'Exceeded' };
      const v = buildGoalView(goal({ id: '1', kind: 'Expense' }), progress);
      expect(v.state).toBe('exceeded');
      expect(v.progressTone).toBe('critical');
      expect(v.barPercent).toBe(100);
    });
    it('receita atingida fica success', () => {
      const progress: GoalProgress = { goalId: '1', kind: 'Income', mode: 'Target', target: 1000, realized: 1000, pending: 0, percent: 100, remaining: 0, state: 'Achieved' };
      const v = buildGoalView(goal({ id: '1', kind: 'Income' }), progress);
      expect(v.state).toBe('achieved');
      expect(v.progressTone).toBe('success');
    });
    it('pending fica separado do realizado', () => {
      const progress: GoalProgress = { goalId: '1', kind: 'Income', mode: 'Target', target: 10000, realized: 7500, pending: 2000, percent: 75, remaining: 2500, state: 'OnTrack' };
      const v = buildGoalView(goal({ id: '1', kind: 'Income' }), progress);
      expect(v.realized).toBe(7500);
      expect(v.pending).toBe(2000);
      expect(v.percent).toBe(75);
    });
  });

  describe('fallback sem progresso do backend', () => {
    it('deriva percentual e estado de consumo da despesa', () => {
      const v = buildGoalView(goal({ id: '1', kind: 'Expense', targetAmount: 1000, currentAmount: 850, warningThreshold: 80 }));
      expect(v.percent).toBe(85);
      expect(v.state).toBe('attention');
    });
    it('status persistido tem prioridade (Pausada)', () => {
      const v = buildGoalView(goal({ id: '1', kind: 'Income', status: 'Paused' }));
      expect(v.state).toBe('paused');
      expect(v.stateLabel).toBe('Pausada');
    });
  });

  describe('summary e filtros', () => {
    const views = [
      buildGoalView(goal({ id: '1', kind: 'Expense', currentAmount: 1100 })), // exceeded
      buildGoalView(goal({ id: '2', kind: 'Income', currentAmount: 1000 })),   // achieved
      buildGoalView(goal({ id: '3', kind: 'Investment', currentAmount: 100 })),// active
      buildGoalView(goal({ id: '4', kind: 'Income', status: 'Archived' }))
    ];

    it('summary agrega ativas/atingidas/atenção', () => {
      const s = buildGoalsSummary(views);
      expect(s.achieved).toBe(1);
      expect(s.attention).toBeGreaterThanOrEqual(1);
    });
    it('filtra por tipo e oculta arquivadas em "all"', () => {
      expect(filterGoals(views, 'all').some((v) => v.state === 'archived')).toBeFalse();
      expect(filterGoals(views, 'Income').length).toBe(1); // arquivada excluída
      expect(filterGoals(views, 'archived').length).toBe(1);
    });
  });
});
