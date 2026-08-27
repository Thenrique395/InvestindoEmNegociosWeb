import { StoredCard, StoredExpense } from '../data/api-data.service';
import {
  bestPurchaseDay,
  buildCardMetrics,
  buildCardsOverview,
  statementStatusFor,
  usageToneFor
} from './card-metrics.model';
import { nextOccurrenceOfDay } from '../utils/date-recurrence';

function card(partial: Partial<StoredCard> & { id: string }): StoredCard {
  return {
    bandeira: '1',
    numero: '4111111111111111',
    nome: 'Cartão',
    limiteCredito: 10000,
    diaFechamento: 5,
    diaVencimento: 15,
    ...partial
  };
}

function expense(partial: Partial<StoredExpense> & { id: string; cartao: string }): StoredExpense {
  return {
    nome: 'Compra',
    categoria: 'Geral',
    valor: 100,
    vencimento: '15/07/2026',
    status: 'OPEN',
    ...partial
  } as StoredExpense;
}

describe('card-metrics.model', () => {
  const today = new Date(2026, 6, 10); // 10/07/2026

  describe('usageToneFor', () => {
    it('ok até 50%', () => expect(usageToneFor(50)).toBe('ok'));
    it('warning entre 51 e 80', () => expect(usageToneFor(75)).toBe('warning'));
    it('critical acima de 80', () => expect(usageToneFor(81)).toBe('critical'));
  });

  describe('bestPurchaseDay', () => {
    it('é o dia seguinte ao fechamento', () => expect(bestPurchaseDay(5)).toBe(6));
    it('volta para 1 quando o fechamento é 31', () => expect(bestPurchaseDay(31)).toBe(1));
  });

  describe('nextOccurrenceOfDay', () => {
    it('usa o mês atual quando o dia ainda não passou', () => {
      const d = nextOccurrenceOfDay(15, today);
      expect(d.getMonth()).toBe(6);
      expect(d.getDate()).toBe(15);
    });

    it('vai para o próximo mês quando o dia já passou', () => {
      const d = nextOccurrenceOfDay(5, today);
      expect(d.getMonth()).toBe(7);
      expect(d.getDate()).toBe(5);
    });

    it('mantém o dia 30 corretamente (não clampa em 28)', () => {
      const d = nextOccurrenceOfDay(30, today); // hoje 10/07 → 30/07
      expect(d.getMonth()).toBe(6);
      expect(d.getDate()).toBe(30);
    });

    it('cai no último dia do mês quando o dia excede (31 em fevereiro)', () => {
      const d = nextOccurrenceOfDay(31, new Date(2026, 1, 10)); // fev/2026 → 28
      expect(d.getMonth()).toBe(1);
      expect(d.getDate()).toBe(28);
    });
  });

  describe('buildCardMetrics', () => {
    it('deriva uso, disponível e percentual das despesas em aberto', () => {
      const c = card({ id: 'c1', limiteCredito: 10000 });
      const expenses = [
        expense({ id: 'e1', cartao: 'c1', valor: 3000 }),
        expense({ id: 'e2', cartao: 'c1', valor: 1000, status: 'PAID' }), // paga, não conta
        expense({ id: 'e3', cartao: 'outro', valor: 5000 }) // outro cartão
      ];
      const m = buildCardMetrics(c, expenses, today);
      expect(m.usedAmount).toBe(3000);
      expect(m.availableAmount).toBe(7000);
      expect(m.usagePercent).toBe(30);
      expect(m.usageTone).toBe('ok');
      expect(m.openCount).toBe(1);
      expect(m.bestPurchaseDay).toBe(6);
    });

    it('marca overdue quando há despesa em aberto vencida', () => {
      const c = card({ id: 'c1' });
      const m = buildCardMetrics(c, [expense({ id: 'e1', cartao: 'c1', vencimento: '01/07/2026' })], today);
      expect(m.overdueCount).toBe(1);
      expect(m.status).toBe('overdue');
    });

    it('marca due-soon quando o vencimento está a ≤7 dias', () => {
      const c = card({ id: 'c1', diaVencimento: 15 }); // vence 15/07, hoje 10/07 → 5 dias
      const m = buildCardMetrics(c, [expense({ id: 'e1', cartao: 'c1', vencimento: '20/07/2026' })], today);
      expect(m.status).toBe('due-soon');
      expect(m.daysUntilDue).toBe(5);
    });

    it('no-invoice quando não há despesa em aberto', () => {
      const c = card({ id: 'c1' });
      const m = buildCardMetrics(c, [], today);
      expect(m.status).toBe('no-invoice');
      expect(m.usedAmount).toBe(0);
      expect(m.nextDueDate).toBeNull();
    });
  });

  describe('buildCardsOverview', () => {
    it('agrega total em aberto, uso geral e próxima fatura', () => {
      const cards = [
        card({ id: 'c1', nome: 'Nubank', limiteCredito: 10000, diaVencimento: 15 }),
        card({ id: 'c2', nome: 'Inter', limiteCredito: 5000, diaVencimento: 28 })
      ];
      const expenses = [
        expense({ id: 'e1', cartao: 'c1', valor: 2000, vencimento: '20/07/2026' }),
        expense({ id: 'e2', cartao: 'c2', valor: 1000, vencimento: '20/07/2026' })
      ];
      const o = buildCardsOverview(cards, expenses, today);
      expect(o.totalOpen).toBe(3000);
      expect(o.totalLimit).toBe(15000);
      expect(o.overallUsagePercent).toBe(20);
      expect(o.activeCards).toBe(2);
      expect(o.cardsWithOpenInvoice).toBe(2);
      expect(o.nextInvoice?.cardName).toBe('Nubank'); // vence dia 15 (mais cedo)
    });

    it('nextInvoice nulo quando não há faturas em aberto', () => {
      const o = buildCardsOverview([card({ id: 'c1' })], [], today);
      expect(o.nextInvoice).toBeNull();
      expect(o.totalOpen).toBe(0);
    });
  });

  describe('statementStatusFor', () => {
    it('paga quando não há saldo em aberto', () => {
      expect(statementStatusFor({ totalAmount: 500, totalOpen: 0, statementCloseDate: '2026-06-05', statementDueDate: '2026-06-15' }, today)).toBe('paid');
    });
    it('atrasada quando venceu com saldo em aberto', () => {
      expect(statementStatusFor({ totalAmount: 500, totalOpen: 500, statementCloseDate: '2026-06-05', statementDueDate: '2026-06-15' }, today)).toBe('overdue');
    });
    it('fechada quando fechou mas ainda não venceu', () => {
      expect(statementStatusFor({ totalAmount: 500, totalOpen: 500, statementCloseDate: '2026-07-05', statementDueDate: '2026-07-15' }, today)).toBe('closed');
    });
    it('aberta quando ainda não fechou', () => {
      expect(statementStatusFor({ totalAmount: 500, totalOpen: 500, statementCloseDate: '2026-07-20', statementDueDate: '2026-07-30' }, today)).toBe('open');
    });
  });
});
