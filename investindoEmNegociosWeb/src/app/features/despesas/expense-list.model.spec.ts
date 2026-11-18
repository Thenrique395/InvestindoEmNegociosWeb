import type { StoredExpense } from '../../core/data/api-data.service';
import { anticipatableExpenses, expenseMonthComparison, expenseTotal, filterExpenseEntries, selectedExpenseIds, type ExpenseFilters, type ExpenseSort } from './expense-list.model';

const expense = (id: string, overrides: Partial<StoredExpense> = {}): StoredExpense => ({ id, nome: id, categoria: 'Casa', categoryId: 'casa', vencimento: '10/11/2026', valor: 100, status: 'OPEN', ...overrides });
const filters: ExpenseFilters = { status: 'ALL', category: 'ALL', name: '', sortBy: null, sortDir: 1 };
const paymentLabel = (item: StoredExpense) => item.cartao ? 'Cartão' : 'À vista';

describe('Consulta e seleção de despesas', () => {
  beforeEach(() => { jasmine.clock().install(); jasmine.clock().mockDate(new Date(2026, 10, 15)); });
  afterEach(() => jasmine.clock().uninstall());

  it('combina nome sem distinção de caixa, categoria e status exibido de atraso', () => {
    const result = filterExpenseEntries([
      expense('1', { nome: 'Mercado', categoryId: 'alimentos' }),
      expense('2', { nome: 'MERCADO', categoryId: 'alimentos', status: 'PAID' }),
      expense('3', { nome: 'Mercado', categoryId: 'outros' }),
      expense('4', { nome: 'Farmácia', categoryId: 'alimentos' })
    ], { ...filters, name: 'mErCa', category: 'alimentos', status: 'OVERDUE' }, paymentLabel);
    expect(result.map(item => item.id)).toEqual(['1']);
  });
  it('não classifica como atrasada uma despesa em aberto com vencimento futuro', () => {
    const result = filterExpenseEntries([expense('ontem'), expense('futura', { vencimento: '20/11/2026' })], { ...filters, status: 'OPEN' }, paymentLabel);
    expect(result.map(item => item.id)).toEqual(['futura']);
  });
  const sortable = Object.freeze([
    Object.freeze(expense('B', { nome: 'Beta', categoria: 'Zebra', valor: 20, vencimento: '20/11/2026', status: 'PAID', cartao: 'c1' })),
    Object.freeze(expense('A', { nome: 'Alfa', categoria: 'Aluguel', valor: 10, vencimento: '01/11/2026', status: 'OPEN' }))
  ]);
  for (const field of ['nome', 'categoria', 'pagamento', 'vencimento', 'valor', 'status'] as ExpenseSort[]) {
    it(`ordena ${field} nos dois sentidos sem modificar o store de origem`, () => {
      const ascending = filterExpenseEntries(sortable, { ...filters, sortBy: field }, paymentLabel);
      const descending = filterExpenseEntries(sortable, { ...filters, sortBy: field, sortDir: -1 }, paymentLabel);
      expect(ascending.map(item => item.id)).toEqual(['A', 'B']);
      expect(descending.map(item => item.id)).toEqual(['B', 'A']);
      expect(sortable.map(item => item.id)).toEqual(['B', 'A']);
    });
  }
  it('sem ordenação preserva a ordem e retorna uma lista independente', () => {
    const result = filterExpenseEntries(sortable, filters, paymentLabel);
    expect(result.map(item => item.id)).toEqual(['B', 'A']);
    expect(result).not.toBe(sortable);
  });
  it('não mantém seleção de itens ocultos, excluídos, pagos, cancelados ou sem id', () => {
    const entries = [expense('aberta'), expense('paga', { status: 'PAID' }), expense('cancelada', { status: 'CANCELED' }), expense('parcial', { status: 'PARTIALLY_PAID' }), expense('antecipada', { status: 'ANTICIPATED' }), expense('')];
    const selected = new Set(['oculta', 'excluida', 'aberta', 'paga', 'cancelada', 'parcial', 'antecipada', '']);
    expect(selectedExpenseIds(entries, selected)).toEqual(['aberta', 'parcial', 'antecipada']);
    expect(selected.size).toBe(8);
  });
  it('antecipação exige seleção e mês futuro, não apenas dia futuro', () => {
    const entries = [
      expense('hoje', { vencimento: '15/11/2026' }), expense('amanha', { vencimento: '16/11/2026' }),
      expense('passado', { vencimento: '01/10/2026' }), expense('futura', { vencimento: '01/12/2026' }),
      expense('parcial', { vencimento: '01/12/2026', status: 'PARTIALLY_PAID' }),
      expense('paga', { vencimento: '01/12/2026', status: 'PAID' }),
      expense('cancelada', { vencimento: '01/12/2026', status: 'CANCELED' }),
      expense('antecipada', { vencimento: '01/12/2026', status: 'ANTICIPATED' }),
      expense('invalida', { vencimento: '' }), expense('nao-selecionada', { vencimento: '01/12/2026' })
    ];
    const selected = entries.filter(item => item.id !== 'nao-selecionada').map(item => item.id);
    expect(anticipatableExpenses(entries, selected, new Date(2026, 10, 15)).map(item => item.id)).toEqual(['futura', 'parcial']);
  });
  it('antecipação atravessa a virada do ano e rejeita meses anteriores', () => {
    expect(anticipatableExpenses([expense('jan', { vencimento: '01/01/2027' }), expense('velha', { vencimento: '01/01/2026' })], ['jan', 'velha'], new Date(2026, 11, 31)).map(item => item.id)).toEqual(['jan']);
  });
  it('antecipada pertence às pendentes, sem somar parcelas pagas e canceladas', () => {
    const entries = [expense('aberta', { valor: 100 }), expense('parcial', { valor: 20, status: 'PARTIALLY_PAID' }), expense('antecipada', { valor: 30, status: 'ANTICIPATED' }), expense('paga', { valor: 40, status: 'PAID' }), expense('cancelada', { valor: 999, status: 'CANCELED' }), expense('legada', { valor: 10, status: undefined })];
    expect(expenseTotal(entries, 'pending')).toBe(160);
    expect(expenseTotal(entries, 'anticipated')).toBe(30);
    expect(expenseTotal(entries, 'paid')).toBe(40);
    expect(expenseTotal([], 'pending')).toBe(0);
  });
});

describe('Comparativo mensal de despesas', () => {
  it('não mostra comparação sem movimento nos dois meses', () => {
    expect(expenseMonthComparison(0, 0, 'Outubro')).toBeNull();
  });
  it('diferencia início de histórico de crescimento percentual', () => {
    expect(expenseMonthComparison(0, 200, 'Outubro')).toEqual({ month: 'Outubro', delta: 200, deltaAbs: 200, percent: 100, trend: 'up', isNew: true });
  });
  it('apresenta queda e valor absoluto sem perder o sinal percentual', () => {
    expect(expenseMonthComparison(200, 100, 'Outubro')).toEqual({ month: 'Outubro', delta: -100, deltaAbs: 100, percent: -50, trend: 'down', isNew: false });
  });
  it('preserva igualdade e redução a zero', () => {
    expect(expenseMonthComparison(100, 100, 'Outubro')?.trend).toBe('flat');
    expect(expenseMonthComparison(100, 0, 'Outubro')?.percent).toBe(-100);
  });
});
