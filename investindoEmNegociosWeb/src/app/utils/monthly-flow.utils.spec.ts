import { StoredIncome } from '../data/api-data.service';
import { buildMonthlyFlowSeries, hasMonthlyFlowData } from './monthly-flow.utils';

type IncomeSample = Pick<StoredIncome, 'valor' | 'recebimento' | 'status'>;

describe('buildMonthlyFlowSeries', () => {
  const reference = new Date(2026, 6, 15); // julho/2026

  it('gera a quantidade pedida de meses terminando no mês de referência', () => {
    const points = buildMonthlyFlowSeries([], [], reference, 6);
    expect(points.length).toBe(6);
    expect(points[0].key).toBe('2026-02');
    expect(points[5].key).toBe('2026-07');
  });

  it('soma despesas por mês de vencimento e receitas recebidas por mês de recebimento', () => {
    const expenses = [
      { valor: 100, vencimento: '05/07/2026' },
      { valor: 50, vencimento: '20/07/2026' },
      { valor: 80, vencimento: '10/06/2026' }
    ];
    const incomes: IncomeSample[] = [
      { valor: 300, recebimento: '01/07/2026', status: 'PAID' },
      { valor: 200, recebimento: '02/07/2026', status: 'OPEN' }, // pendente: não conta
      { valor: 120, recebimento: '15/06/2026', status: 'ANTICIPATED' }
    ];
    const points = buildMonthlyFlowSeries(expenses, incomes, reference, 2);
    const june = points[0];
    const july = points[1];
    expect(june.expense).toBe(80);
    expect(june.income).toBe(120);
    expect(june.balance).toBe(40);
    expect(july.expense).toBe(150);
    expect(july.income).toBe(300);
    expect(july.balance).toBe(150);
  });

  it('ignora lançamentos com data inválida e atravessa a virada de ano', () => {
    const points = buildMonthlyFlowSeries(
      [{ valor: 10, vencimento: 'data-invalida' }],
      [],
      new Date(2026, 0, 10), // janeiro/2026
      3
    );
    expect(points.map((p) => p.key)).toEqual(['2025-11', '2025-12', '2026-01']);
    expect(points.every((p) => p.expense === 0)).toBeTrue();
  });

  it('hasMonthlyFlowData detecta série vazia', () => {
    const empty = buildMonthlyFlowSeries([], [], reference, 3);
    expect(hasMonthlyFlowData(empty)).toBeFalse();
    const filled = buildMonthlyFlowSeries([{ valor: 5, vencimento: '01/07/2026' }], [], reference, 3);
    expect(hasMonthlyFlowData(filled)).toBeTrue();
  });
});
