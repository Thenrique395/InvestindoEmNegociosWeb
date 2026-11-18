import type { StoredExpense, StoredIncome } from '../../core/data/api-data.service';
import { buildDashboardRecurrences, formatCompactLocaleDate } from './dashboard-recurrences.model';
const expense = (id: string, overrides: Partial<StoredExpense> = {}): StoredExpense => ({ id, nome: 'Conta', categoria: '', valor: 100, vencimento: '10/11/2026', ...overrides });
const income = (id: string, overrides: Partial<StoredIncome> = {}): StoredIncome => ({ id, fonte: 'Salário', valor: 100, recebimento: '10/11/2026', ...overrides });

describe('Recorrências do dashboard', () => {
  const reference = new Date(2026, 10, 15);
  it('mostra somente recorrências da competência, inclusive séries parceladas', () => {
    const result = buildDashboardRecurrences([
      expense('fixa', { fixa: true }), expense('serie', { serieId: 'plan' }), expense('parcela', { parcelasTotal: 12 }),
      expense('avulsa'), expense('outro-mes', { fixa: true, vencimento: '10/12/2026' }), expense('invalida', { fixa: true, vencimento: 'inválida' })
    ], [income('fixa', { fixa: true }), income('avulsa'), income('passado', { fixa: true, recebimento: '10/10/2026' })], reference);
    expect(result.map(item => item.id)).toEqual(['expense-fixa', 'expense-serie', 'expense-parcela', 'income-fixa']);
    expect(result[2].kindLabel).toBe('Parcela 1/12');
  });
  it('prioriza despesas e valores maiores sem reordenar os dados de origem', () => {
    const entries = Object.freeze([expense('pequena', { fixa: true, valor: 10 }), expense('grande', { fixa: true, valor: 200 })]);
    const result = buildDashboardRecurrences(entries, [income('entrada', { fixa: true, valor: 5000 })], reference);
    expect(result.map(item => item.id)).toEqual(['expense-grande', 'expense-pequena', 'income-entrada']);
    expect(entries[0].id).toBe('pequena');
  });
  it('preserva rótulos de assinatura, parcela e conta fixa e tons de pagamento', () => {
    const result = buildDashboardRecurrences([
      expense('assinatura', { fixa: true, categoria: 'ASSINATURAS', valor: 300, status: 'PAID' }),
      expense('parcela', { parcelasTotal: 12, parcelaNumero: 4, valor: 200, status: 'PARTIALLY_PAID' }),
      expense('fixa', { fixa: true, valor: 100 })
    ], [income('recebida', { fixa: true, status: 'PAID', valor: 200 }), income('pendente', { fixa: true })], reference);
    expect(result.map(item => [item.kindLabel, item.tone])).toEqual([
      ['Assinatura', 'muted'], ['Parcela 4/12', 'warning'], ['Conta fixa', 'warning'],
      ['Receita fixa', 'success'], ['Receita fixa', 'info']
    ]);
    expect(result[0].dateLabel).toBe('10/11');
  });
  it('usa rótulos de fallback e aceita zero sem introduzir valores fictícios', () => {
    const result = buildDashboardRecurrences([expense('x', { fixa: true, nome: '', valor: 0 })], [income('x', { fixa: true, fonte: '', valor: 0 })], reference);
    expect(result.map(item => [item.title, item.amount])).toEqual([['Despesa recorrente', 0], ['Receita recorrente', 0]]);
    expect(formatCompactLocaleDate('inválida')).toBe('inválida');
  });
});
