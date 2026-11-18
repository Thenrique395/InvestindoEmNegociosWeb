import type { StoredExpense, StoredIncome } from '../../core/data/api-data.service';
import { dashboardPeriodRange, previousDashboardPeriodRange, dateInDashboardPeriod, sumDashboardExpenses, sumDashboardIncomes, dashboardBalanceBefore } from './dashboard-period.model';

const expense = (vencimento: string, valor: number, status: StoredExpense['status'] = 'OPEN'): StoredExpense => ({ id: vencimento, nome: 'Conta', categoria: '', vencimento, valor, status });
const income = (recebimento: string, valor: number, status: StoredIncome['status'] = 'PAID'): StoredIncome => ({ id: recebimento, fonte: 'Entrada', recebimento, valor, status });

describe('Períodos e totais financeiros do dashboard', () => {
  it('mantém as competências de mês, trimestre e ano em fevereiro bissexto', () => {
    const date = new Date(2024, 1, 29);
    expect(dashboardPeriodRange(date, 'month')).toEqual({ startKey: '2024-02', endKey: '2024-02' });
    expect(dashboardPeriodRange(date, 'quarter')).toEqual({ startKey: '2024-01', endKey: '2024-03' });
    expect(dashboardPeriodRange(date, 'year')).toEqual({ startKey: '2024-01', endKey: '2024-12' });
    expect(date.getDate()).toBe(29);
  });
  it('compara janeiro ao mês, trimestre e ano anteriores atravessando a virada', () => {
    const date = new Date(2026, 0, 31);
    expect(previousDashboardPeriodRange(date, 'month')).toEqual({ startKey: '2025-12', endKey: '2025-12' });
    expect(previousDashboardPeriodRange(date, 'quarter')).toEqual({ startKey: '2025-10', endKey: '2025-12' });
    expect(previousDashboardPeriodRange(date, 'year')).toEqual({ startKey: '2025-01', endKey: '2025-12' });
  });
  it('compara novembro com o terceiro trimestre e outubro', () => {
    const date = new Date(2026, 10, 15);
    expect(previousDashboardPeriodRange(date, 'quarter')).toEqual({ startKey: '2026-07', endKey: '2026-09' });
    expect(previousDashboardPeriodRange(date, 'month')).toEqual({ startKey: '2026-10', endKey: '2026-10' });
  });
  const range = { startKey: '2026-10', endKey: '2026-12' };
  it('inclui os extremos da competência e rejeita datas ausentes ou fora dela', () => {
    expect(dateInDashboardPeriod('01/10/2026', range)).toBeTrue();
    expect(dateInDashboardPeriod('31/12/2026', range)).toBeTrue();
    for (const value of ['30/09/2026', '01/01/2027', '', 'inválida']) expect(dateInDashboardPeriod(value, range)).toBeFalse();
  });
  it('mantém despesas antecipadas e parcialmente pagas dentro das abertas', () => {
    const entries = [expense('10/11/2026', 100), expense('10/11/2026', 20, 'PARTIALLY_PAID'), expense('10/11/2026', 30, 'ANTICIPATED'), expense('10/11/2026', 40, 'PAID'), expense('10/11/2026', 10, 'CANCELED'), expense('01/01/2027', 999), expense('', 999)];
    expect(sumDashboardExpenses(entries, range)).toBe(200);
    expect(sumDashboardExpenses(entries, range, 'open')).toBe(150);
    // Caracterização da tela: o grupo liquidado é o complemento das abertas.
    expect(sumDashboardExpenses(entries, range, 'settled')).toBe(50);
  });
  it('separa receitas recebidas e pendentes sem incluir cancelamentos ou outros períodos', () => {
    const entries = [income('10/11/2026', 100), income('10/11/2026', 20, 'PARTIALLY_PAID'), income('10/11/2026', 30, 'OPEN'), income('10/11/2026', 10, 'ANTICIPATED'), income('10/11/2026', 999, 'CANCELED'), income('10/01/2027', 999)];
    expect(sumDashboardIncomes(entries, range)).toBe(120);
    expect(sumDashboardIncomes(entries, range, 'pending')).toBe(40);
  });
  it('saldo anterior usa somente receitas recebidas e movimentos anteriores ao período', () => {
    const result = dashboardBalanceBefore([
      expense('01/09/2026', 200), expense('01/10/2026', 999), expense('', 999)
    ], [income('01/09/2026', 1000), income('01/09/2026', 50, 'PARTIALLY_PAID'), income('01/09/2026', 999, 'OPEN'), income('01/10/2026', 999), income('', 999)], range);
    expect(result).toBe(850);
  });
  it('período sem movimentos preserva totais e saldo zero', () => {
    expect(sumDashboardExpenses([], range)).toBe(0);
    expect(sumDashboardIncomes([], range)).toBe(0);
    expect(dashboardBalanceBefore([], [], range)).toBe(0);
  });
});
