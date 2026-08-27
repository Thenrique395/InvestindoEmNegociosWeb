import { StoredExpense, StoredIncome } from '../data/api-data.service';
import { InsightEngineItemResponse } from '../account.models';
import {
  buildConicGradient,
  calculateInsightHealthScore,
  dateKey,
  estimateRiskDayFromCurrentData,
  formatCurrency,
  formatDelta,
  getFinancialGoalLabel,
  hasCriticalOverdueExpenseContext,
  isExpenseOpen,
  isIncomePending,
  isIncomeReceived,
  rangeEndDate,
  resolveInsightShortGoal
} from './home-insight.utils';

describe('home-insight.utils', () => {
  it('formata valores em moeda BRL', () => {
    expect(formatCurrency(1234.5)).toContain('1.234,50');
  });

  describe('formatDelta', () => {
    it('marca como novo no mes quando nao havia valor anterior', () => {
      expect(formatDelta(100, 0)).toContain('novo no mês');
    });

    it('marca como sem variacao quando atual e anterior sao zero', () => {
      expect(formatDelta(0, 0)).toBe('sem variação');
    });

    it('calcula percentual de aumento em relacao ao mes anterior', () => {
      expect(formatDelta(150, 100)).toBe('+50% vs mês anterior');
    });

    it('calcula percentual de queda em relacao ao mes anterior', () => {
      expect(formatDelta(50, 100)).toBe('-50% vs mês anterior');
    });
  });

  describe('calculateInsightHealthScore', () => {
    it('retorna 100 quando nao ha nenhum problema', () => {
      expect(calculateInsightHealthScore(1000, 0, 500, 0, 0, 0, 1000)).toBe(100);
    });

    it('penaliza despesas vencidas, receitas atrasadas e saldo projetado negativo', () => {
      expect(calculateInsightHealthScore(1000, 0, 500, 1, 1, 0, -10)).toBe(100 - 12 - 8 - 20);
    });

    it('nunca retorna valor abaixo de zero', () => {
      expect(calculateInsightHealthScore(0, 100, 1000, 10, 10, 1000, -1)).toBe(0);
    });
  });

  describe('rangeEndDate', () => {
    it('retorna o ultimo dia do mes informado', () => {
      const result = rangeEndDate('2026-02');
      expect(result.getFullYear()).toBe(2026);
      expect(result.getMonth()).toBe(1);
      expect(result.getDate()).toBe(28);
    });
  });

  describe('dateKey', () => {
    it('formata a data como yyyy-MM-dd', () => {
      expect(dateKey(new Date(2026, 5, 1))).toBe('2026-06-01');
    });
  });

  describe('isExpenseOpen', () => {
    it('considera aberta despesa sem status, OPEN ou PARTIALLY_PAID', () => {
      expect(isExpenseOpen(undefined)).toBeTrue();
      expect(isExpenseOpen('OPEN')).toBeTrue();
      expect(isExpenseOpen('PARTIALLY_PAID')).toBeTrue();
      expect(isExpenseOpen('PAID')).toBeFalse();
    });
  });

  describe('isIncomeReceived', () => {
    it('considera recebida receita PAID, PARTIALLY_PAID ou ANTICIPATED', () => {
      expect(isIncomeReceived('PAID')).toBeTrue();
      expect(isIncomeReceived('PARTIALLY_PAID')).toBeTrue();
      expect(isIncomeReceived('ANTICIPATED')).toBeTrue();
      expect(isIncomeReceived('OPEN')).toBeFalse();
    });
  });

  describe('isIncomePending', () => {
    it('considera pendente receita sem status ou OPEN', () => {
      expect(isIncomePending(undefined)).toBeTrue();
      expect(isIncomePending('OPEN')).toBeTrue();
      expect(isIncomePending('PAID')).toBeFalse();
    });
  });

  describe('hasCriticalOverdueExpenseContext', () => {
    it('retorna falso quando nao ha despesas vencidas', () => {
      expect(hasCriticalOverdueExpenseContext(0, 100, 50, 100)).toBeFalse();
    });

    it('retorna verdadeiro quando o saldo disponivel nao cobre o valor vencido', () => {
      expect(hasCriticalOverdueExpenseContext(1, 100, 50, 100)).toBeTrue();
    });

    it('retorna verdadeiro quando o saldo principal e negativo mesmo com saldo disponivel suficiente', () => {
      expect(hasCriticalOverdueExpenseContext(1, 50, 100, -10)).toBeTrue();
    });

    it('retorna falso quando o saldo disponivel cobre o valor vencido e o saldo principal e positivo', () => {
      expect(hasCriticalOverdueExpenseContext(1, 50, 100, 100)).toBeFalse();
    });
  });

  describe('estimateRiskDayFromCurrentData', () => {
    const range = { startKey: '2026-06', endKey: '2026-06' };

    it('retorna null quando o saldo nunca fica negativo', () => {
      const today = new Date(2026, 5, 1);
      const incomes: StoredIncome[] = [{ id: '1', fonte: 'Salário', valor: 1000, recebimento: '05/06/2026', status: 'OPEN' } as StoredIncome];
      const expenses: StoredExpense[] = [{ id: '1', nome: 'Aluguel', categoria: 'Moradia', valor: 500, vencimento: '10/06/2026', status: 'OPEN' } as StoredExpense];

      expect(estimateRiskDayFromCurrentData(today, range, 0, incomes, expenses)).toBeNull();
    });

    it('retorna a data em que o saldo projetado fica negativo', () => {
      const today = new Date(2026, 5, 1);
      const incomes: StoredIncome[] = [];
      const expenses: StoredExpense[] = [{ id: '1', nome: 'Aluguel', categoria: 'Moradia', valor: 500, vencimento: '10/06/2026', status: 'OPEN' } as StoredExpense];

      const result = estimateRiskDayFromCurrentData(today, range, 100, incomes, expenses);

      expect(result?.toDateString()).toBe(new Date(2026, 5, 10).toDateString());
    });
  });

  describe('resolveInsightShortGoal', () => {
    function buildItem(overrides: Partial<InsightEngineItemResponse>): InsightEngineItemResponse {
      return {
        family: 'reactive',
        scenario: 'default',
        priority: 'ok',
        title: '',
        message: '',
        action: '',
        healthScore: 100,
        currentCoverage: 100,
        projectedCoverage: 100,
        projectedBalance: 0,
        highlights: [],
        ...overrides
      } as InsightEngineItemResponse;
    }

    it('retorna meta patrimonial', () => {
      expect(resolveInsightShortGoal(buildItem({ family: 'patrimonial' }))).toContain('avanço patrimonial');
    });

    it('retorna meta estrutural', () => {
      expect(resolveInsightShortGoal(buildItem({ family: 'structural' }))).toContain('pressão estrutural');
    });

    it('retorna meta preventiva', () => {
      expect(resolveInsightShortGoal(buildItem({ family: 'preventive' }))).toContain('janela de vencimentos');
    });

    it('retorna meta padrao para os demais casos', () => {
      expect(resolveInsightShortGoal(buildItem({ family: 'reactive' }))).toContain('estabilizar o caixa');
    });
  });

  describe('getFinancialGoalLabel', () => {
    it('mapeia os objetivos conhecidos', () => {
      expect(getFinancialGoalLabel('vida-financeira')).toBe('Melhorar vida financeira');
      expect(getFinancialGoalLabel('sair-dividas')).toBe('Sair das dívidas');
      expect(getFinancialGoalLabel('comecar-investir')).toBe('Começar a investir');
      expect(getFinancialGoalLabel('reserva-emergencia')).toBe('Criar reserva de emergência');
    });

    it('retorna null para objetivo desconhecido ou nulo', () => {
      expect(getFinancialGoalLabel('outro')).toBeNull();
      expect(getFinancialGoalLabel(null)).toBeNull();
    });
  });

  describe('buildConicGradient', () => {
    it('retorna gradiente neutro quando nao ha fatias com percentual positivo', () => {
      expect(buildConicGradient([])).toBe('conic-gradient(var(--surface-inset) 0deg 360deg)');
      expect(buildConicGradient([{ percent: 0, color: '#fff' }])).toBe('conic-gradient(var(--surface-inset) 0deg 360deg)');
    });

    it('monta os segmentos proporcionais ao percentual de cada fatia', () => {
      const result = buildConicGradient([
        { percent: 50, color: '#111' },
        { percent: 50, color: '#222' }
      ]);

      expect(result).toBe('conic-gradient(#111 0.00deg 180.00deg, #222 180.00deg 360.00deg)');
    });
  });
});
