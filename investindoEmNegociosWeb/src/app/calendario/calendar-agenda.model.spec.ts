import { StoredCard, StoredExpense, StoredIncome } from '../data/api-data.service';
import { LoanContractResponse } from '../loans.service';
import { Goal } from '../goals.service';
import {
  buildCalendarEvents,
  buildPeriodSummary,
  buildTimeline,
  categoryFor,
  CalendarSources,
  eventsForDay,
  groupByDay,
  pendingEvents,
  statusLabel,
  statusTone,
  summarizeDay,
  todayDigest,
  upcomingEvents
} from './calendar-agenda.model';

const today = new Date(2026, 6, 10); // 10/07/2026 (sexta)
const monthRef = new Date(2026, 6, 1);

function expense(p: Partial<StoredExpense> & { id: string }): StoredExpense {
  return { nome: 'Conta', categoria: 'Casa', valor: 100, vencimento: '15/07/2026', status: 'OPEN', ...p } as StoredExpense;
}
function income(p: Partial<StoredIncome> & { id: string }): StoredIncome {
  return { fonte: 'Salário', categoria: 'Trabalho', valor: 5000, recebimento: '05/07/2026', status: 'OPEN', ...p } as StoredIncome;
}
function card(p: Partial<StoredCard> & { id: string }): StoredCard {
  return { bandeira: '1', numero: '4111', nome: 'Nubank', banco: 'Nubank', limiteCredito: 5000, diaFechamento: 3, diaVencimento: 12, ...p };
}
function loan(p: Partial<LoanContractResponse> & { id: string }): LoanContractResponse {
  return {
    title: 'Financiamento carro',
    principalAmount: 30000,
    annualInterestRate: 12,
    termMonths: 24,
    amortizationType: 'Price',
    startDate: '2026-01-10',
    paymentDay: 10,
    monthlyPayment: 1400,
    totalCost: 33600,
    totalInterest: 3600,
    status: 'Active',
    openBalance: 20000,
    openInstallments: 14,
    createdAt: '2026-01-01',
    installments: [],
    ...p
  };
}
function goal(p: Partial<Goal> & { id: string }): Goal {
  return {
    title: 'Reserva',
    targetAmount: 10000,
    currentAmount: 2000,
    year: 2026,
    status: 'InProgress',
    kind: 'General',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    expectedMonthly: 500,
    targetDate: '2026-07-20',
    ...p
  };
}

function sources(partial: Partial<CalendarSources>): CalendarSources {
  return { expenses: [], incomes: [], cards: [], loans: [], goals: [], ...partial };
}

describe('calendar-agenda.model', () => {
  describe('buildCalendarEvents', () => {
    it('deriva despesa em aberto como prevista e no dia certo', () => {
      const events = buildCalendarEvents(sources({ expenses: [expense({ id: 'e1', vencimento: '15/07/2026' })] }), monthRef, today);
      const e = events.find((ev) => ev.id === 'expense-e1')!;
      expect(e.group).toBe('expense');
      expect(e.status).toBe('forecast');
      expect(e.date.getDate()).toBe(15);
      expect(e.actionable).toBe(true);
    });

    it('marca despesa vencida em aberto como atrasada', () => {
      const events = buildCalendarEvents(sources({ expenses: [expense({ id: 'e1', vencimento: '01/07/2026' })] }), monthRef, today);
      expect(events.find((ev) => ev.id === 'expense-e1')!.status).toBe('overdue');
    });

    it('receita paga vira "recebida" e não é acionável', () => {
      const events = buildCalendarEvents(sources({ incomes: [income({ id: 'i1', status: 'PAID' })] }), monthRef, today);
      const e = events.find((ev) => ev.id === 'income-i1')!;
      expect(e.status).toBe('received');
      expect(e.actionable).toBe(false);
    });

    it('gera fechamento e vencimento de cartão no mês de referência', () => {
      const events = buildCalendarEvents(sources({ cards: [card({ id: 'c1', diaFechamento: 3, diaVencimento: 12 })] }), monthRef, today);
      const close = events.find((ev) => ev.kind === 'card-close' && ev.date.getMonth() === 6);
      const due = events.find((ev) => ev.kind === 'card-due' && ev.date.getMonth() === 6);
      expect(close!.date.getDate()).toBe(3);
      expect(due!.date.getDate()).toBe(12);
    });

    it('deriva parcela de financiamento com atraso quando vencida e em aberto', () => {
      const contract = loan({
        id: 'l1',
        installments: [
          { id: 'p1', installmentNo: 6, dueDate: '2026-07-05', beginningBalance: 0, principalAmount: 0, interestAmount: 0, totalAmount: 1400, endingBalance: 0, status: 'Open' }
        ]
      });
      const events = buildCalendarEvents(sources({ loans: [contract] }), monthRef, today);
      const e = events.find((ev) => ev.group === 'loan')!;
      expect(e.status).toBe('overdue');
      expect(e.amount).toBe(1400);
      expect(e.meta).toBe('Parcela 6/24');
    });

    it('deriva prazo de meta a partir de targetDate real', () => {
      const events = buildCalendarEvents(sources({ goals: [goal({ id: 'g1', targetDate: '2026-07-20' })] }), monthRef, today);
      const e = events.find((ev) => ev.group === 'goal')!;
      expect(e.date.getDate()).toBe(20);
      expect(e.status).toBe('forecast');
    });

    it('ignora meta sem targetDate (não inventa data)', () => {
      const events = buildCalendarEvents(sources({ goals: [goal({ id: 'g1', targetDate: null })] }), monthRef, today);
      expect(events.some((ev) => ev.group === 'goal')).toBe(false);
    });
  });

  describe('agregações', () => {
    const built = buildCalendarEvents(
      sources({
        expenses: [expense({ id: 'e1', valor: 200, vencimento: '15/07/2026' })],
        incomes: [income({ id: 'i1', valor: 5000, recebimento: '05/07/2026' })]
      }),
      monthRef,
      today
    );

    it('summarizeDay soma receitas e despesas do dia', () => {
      const day = eventsForDay(built, new Date(2026, 6, 5));
      const summary = summarizeDay(day);
      expect(summary.incomeTotal).toBe(5000);
      expect(summary.net).toBe(5000);
    });

    it('buildPeriodSummary calcula saldo previsto do mês', () => {
      const summary = buildPeriodSummary(built, monthRef);
      expect(summary.incomeForecast).toBe(5000);
      expect(summary.expenseForecast).toBe(200);
      expect(summary.projectedBalance).toBe(4800);
    });

    it('upcomingEvents traz apenas os próximos 7 dias ainda em aberto', () => {
      const up = upcomingEvents(built, today, 7);
      expect(up.every((ev) => ev.date >= new Date(2026, 6, 10))).toBe(true);
      expect(up.some((ev) => ev.id === 'expense-e1')).toBe(true); // 15/07 dentro da janela
    });

    it('pendingEvents lista somente atrasados', () => {
      const withOverdue = buildCalendarEvents(sources({ expenses: [expense({ id: 'e9', vencimento: '01/07/2026' })] }), monthRef, today);
      const pend = pendingEvents(withOverdue, today);
      expect(pend.length).toBe(1);
      expect(pend[0].status).toBe('overdue');
    });

    it('todayDigest conta eventos do dia por grupo', () => {
      const digest = todayDigest(buildCalendarEvents(sources({ incomes: [income({ id: 'i2', recebimento: '10/07/2026' })] }), monthRef, today), today);
      expect(digest.incomes).toBe(1);
      expect(digest.total).toBe(1);
    });

    it('groupByDay agrupa e ordena por data', () => {
      const groups = groupByDay(built);
      const dates = groups.map((g) => g.date.getTime());
      expect(dates).toEqual([...dates].sort((a, b) => a - b));
    });

    it('buildTimeline separa hoje, semana e mês', () => {
      const timeline = buildTimeline(built, today);
      const week = timeline.find((b) => b.key === 'week')!;
      expect(week.events.some((ev) => ev.id === 'expense-e1')).toBe(true); // 15/07 = 5 dias
    });
  });

  describe('rótulos e categorias', () => {
    it('categoryFor retorna metadados por tipo', () => {
      expect(categoryFor('income').tone).toBe('success');
      expect(categoryFor('card-due').label).toContain('Vencimento');
    });
    it('statusLabel/statusTone mapeiam status', () => {
      expect(statusLabel('overdue')).toBe('Atrasado');
      expect(statusTone('paid')).toBe('success');
      expect(statusTone('overdue')).toBe('danger');
    });
  });
});
