import { Injectable } from '@angular/core';
import { BehaviorSubject, distinctUntilChanged, forkJoin, map } from 'rxjs';
import { PlansService, Plan, CreatePlanPayload } from '../plans.service';
import { InstallmentsService, Installment } from '../installments.service';
import { CardsService, CardDto } from '../cards.service';
import { ScheduleType } from '../types/money-types';
import { InstallmentStatus } from '../types/money-types';

export interface StoredExpense {
  id: string;
  planId?: string;
  nome: string;
  categoria: string;
  valor: number;
  vencimento: string; // DD/MM/AAAA
  userId?: string;
  cartao?: string;
  parcelaNumero?: number;
  parcelasTotal?: number;
  serieId?: string;
  fixa?: boolean;
  fixaMeses?: number | null;
  status?: InstallmentStatus;
}

export interface StoredCard {
  id: string;
  bandeira: string;
  numero: string;
  nome: string;
  banco?: string | null;
  limiteCredito: number;
  diaFechamento: number;
  diaVencimento: number;
  userId: string;
}

export interface StoredIncome {
  id: string;
  planId?: string;
  fonte: string;
  valor: number;
  recebimento: string; // DD/MM/AAAA
  schedule?: ScheduleType;
  startDateIso?: string;
  fixa?: boolean;
  fixaInicio?: string; // MM/AAAA
  userId?: string;
}

type PersistedDb = {
  expenses: StoredExpense[];
  cards: StoredCard[];
  incomes: StoredIncome[];
};

@Injectable({ providedIn: 'root' })
export class ApiDataService {
  private readonly dbSubject = new BehaviorSubject<PersistedDb>({ expenses: [], cards: [], incomes: [] });
  private readonly db$ = this.dbSubject.asObservable();

  readonly expenses$ = this.db$.pipe(
    map((state) => state.expenses),
    distinctUntilChanged()
  );
  readonly cards$ = this.db$.pipe(
    map((state) => state.cards),
    distinctUntilChanged()
  );
  readonly incomes$ = this.db$.pipe(
    map((state) => state.incomes),
    distinctUntilChanged()
  );

  constructor(private plans: PlansService, private installments: InstallmentsService, private cardsApi: CardsService) {
    this.refresh();
  }

  addExpense(expense: Omit<StoredExpense, 'id'>): void {
    const payload = this.toPlanPayloadFromExpense(expense);
    this.plans.create(payload).subscribe({
      next: () => this.refresh(),
      error: (err) => console.error('Falha ao criar despesa', err)
    });
  }

  updateExpense(_id: string, _data: Partial<StoredExpense>): void {
    console.warn('Update de despesa ainda não implementado no backend.');
  }

  removeExpense(_id: string): void {
    this.removeExpenseInstallment(_id);
  }

  removeExpenseSeries(planId: string): void {
    this.plans.delete(planId).subscribe({
      next: () => this.refresh(),
      error: (err) => console.error('Falha ao remover série de despesas', err)
    });
  }

  removeExpenseInstallment(installmentId: string): void {
    this.installments.delete(installmentId).subscribe({
      next: () => this.refresh(),
      error: (err) => console.error('Falha ao remover parcela de despesa', err)
    });
  }

  addCard(card: Omit<StoredCard, 'id'>): void {
    this.cardsApi
      .create({
        brandId: Number(card.bandeira),
        holderName: card.nome,
        nickname: card.nome,
        last4: (card.numero || '').replace(/\D/g, '').slice(-4),
        bank: card.banco || null,
        creditLimit: card.limiteCredito ?? 0,
        statementCloseDay: card.diaFechamento ?? 1,
        dueDay: card.diaVencimento ?? 1
      })
      .subscribe({
        next: () => this.refresh(),
        error: (err) => console.error('Falha ao criar cartão', err)
      });
  }

  updateCard(id: string, data: Partial<StoredCard>): void {
    this.cardsApi
      .update(id, {
        brandId: data.bandeira ? Number(data.bandeira) : 0,
        holderName: data.nome || '',
        nickname: data.nome || '',
        last4: (data.numero || '').replace(/\D/g, '').slice(-4),
        bank: data.banco || null,
        creditLimit: data.limiteCredito ?? 0,
        statementCloseDay: data.diaFechamento ?? 1,
        dueDay: data.diaVencimento ?? 1
      })
      .subscribe({
        next: () => this.refresh(),
        error: (err) => console.error('Falha ao atualizar cartão', err)
      });
  }

  removeCard(id: string): void {
    this.cardsApi.delete(id).subscribe({
      next: () => this.refresh(),
      error: (err) => console.error('Falha ao remover cartão', err)
    });
  }

  addIncome(income: Omit<StoredIncome, 'id'>): void {
    const payload = this.toPlanPayloadFromIncome(income);
    this.plans.create(payload).subscribe({
      next: () => this.refresh(),
      error: (err) => console.error('Falha ao criar receita', err)
    });
  }

  updateIncome(planId: string, data: Partial<StoredIncome>): void {
    const payload = this.toPlanPayloadFromIncome({
      planId,
      fonte: data.fonte || '',
      valor: data.valor ?? 0,
      recebimento: data.recebimento || '',
      fixa: data.fixa,
      fixaInicio: data.fixaInicio
    });

    this.plans.update(planId, payload).subscribe({
      next: () => this.refresh(),
      error: (err) => console.error('Falha ao atualizar receita', err)
    });
  }

  removeIncome(planId: string): void {
    this.plans.delete(planId).subscribe({
      next: () => this.refresh(),
      error: (err) => console.error('Falha ao remover receita', err)
    });
  }

  removeIncomeInstallment(installmentId: string): void {
    this.installments.delete(installmentId).subscribe({
      next: () => this.refresh(),
      error: (err) => console.error('Falha ao remover parcela de receita', err)
    });
  }

  refresh(): void {
    forkJoin({
      incomePlans: this.plans.list('Income'),
      expensePlans: this.plans.list('Expense'),
      incomeInstallments: this.installments.list({ type: 'Income' }),
      expenseInstallments: this.installments.list({ type: 'Expense' }),
      cards: this.cardsApi.list()
    }).subscribe({
      next: ({ incomePlans, expensePlans, incomeInstallments, expenseInstallments, cards }) => {
        const incomes = this.mapIncomes(incomePlans, incomeInstallments);
        const expenses = this.mapExpenses(expensePlans, expenseInstallments);
        const mappedCards = this.mapCards(cards);
        this.dbSubject.next({ incomes, expenses, cards: mappedCards });
      },
      error: (err) => console.error('Falha ao carregar dados do backend', err)
    });
  }

  private mapIncomes(plans: Plan[], installments: Installment[]): StoredIncome[] {
    const lookup = new Map(plans.map((p) => [p.id, p]));
    return installments.map((inst) => {
      const plan = lookup.get(inst.planId);
      return {
        id: inst.id,
        planId: inst.planId,
        fonte: plan?.title || 'Receita',
        valor: inst.amount,
        recebimento: this.formatDate(inst.dueDate),
        schedule: plan?.schedule,
        startDateIso: plan?.startDate,
        fixa: plan?.schedule === 'Recurring',
        fixaInicio: plan?.schedule === 'Recurring' ? this.formatMonth(plan.startDate) : '',
        userId: plan?.userId
      };
    });
  }

  private mapExpenses(plans: Plan[], installments: Installment[]): StoredExpense[] {
    const lookup = new Map(plans.map((p) => [p.id, p]));
    return installments.map((inst) => {
      const plan = lookup.get(inst.planId);
      const categoria =
        (plan as any)?.categoryName ||
        plan?.categoryId ||
        (plan as any)?.category ||
        'Outros';
      const isSeries = (plan?.installmentsCount ?? 0) > 1;
      const isRecurring = plan?.schedule === 'Recurring';
      const rawStatus = (inst as any)?.status || '';
      const status = (rawStatus || '').toString().toUpperCase() as InstallmentStatus;
      return {
        id: inst.id,
        planId: plan?.id,
        nome: plan?.title || 'Despesa',
        categoria,
        valor: inst.amount,
        vencimento: this.formatDate(inst.dueDate),
        userId: plan?.userId,
        parcelaNumero: isSeries ? inst.installmentNo : undefined,
        parcelasTotal: isSeries ? plan?.installmentsCount ?? undefined : undefined,
        serieId: isSeries ? plan?.id : undefined,
        fixa: isRecurring,
        fixaMeses: isRecurring ? null : undefined,
        status: status || 'OPEN'
      };
    });
  }

  private mapCards(cards: CardDto[]): StoredCard[] {
    return cards.map((c) => ({
      id: c.id,
      bandeira: String(c.brandId),
      numero: c.last4,
      nome: c.nickname,
      banco: c.bank ?? null,
      limiteCredito: c.creditLimit ?? 0,
      diaFechamento: c.statementCloseDay ?? 1,
      diaVencimento: c.dueDay ?? 1,
      userId: ''
    }));
  }

  private toPlanPayloadFromIncome(income: Omit<StoredIncome, 'id'>): CreatePlanPayload {
    const schedule: ScheduleType = income.fixa ? 'Recurring' : 'OneTime';
    const startDate = income.fixa
      ? this.firstDayIso(income.fixaInicio)
      : this.toIsoDate(income.recebimento) || this.todayIso();

    return {
      type: 'Income',
      title: income.fonte,
      amount: income.valor,
      schedule,
      startDate,
      frequency: schedule === 'Recurring' ? 'Monthly' : null,
      installmentsCount: schedule === 'OneTime' ? 1 : null
    };
  }

  private toPlanPayloadFromExpense(expense: Omit<StoredExpense, 'id'>): CreatePlanPayload {
    const startDate = this.toIsoDate(expense.vencimento) || this.todayIso();
    const parsedCategory = Number(expense.categoria);
    const categoryId = Number.isFinite(parsedCategory) ? String(parsedCategory) : null;

    // Despesa fixa mensal
    if (expense.fixa) {
      const months = expense.fixaMeses && expense.fixaMeses > 0 ? expense.fixaMeses : null;
      const schedule: ScheduleType = months ? 'Installments' : 'Recurring';
      return {
        type: 'Expense',
        title: expense.nome,
        amount: expense.valor,
        schedule,
        startDate,
        categoryId,
        frequency: schedule === 'Recurring' ? 'Monthly' : null,
        installmentsCount: schedule === 'Installments' ? months : null
      };
    }

    const parcelas = expense.parcelasTotal && expense.parcelasTotal > 1 ? expense.parcelasTotal : 1;
    const schedule: ScheduleType = parcelas > 1 ? 'Installments' : 'OneTime';
    const amount = parcelas > 1 ? expense.valor / parcelas : expense.valor;

    return {
      type: 'Expense',
      title: expense.nome,
      amount,
      schedule,
      startDate,
      categoryId,
      frequency: null,
      installmentsCount: schedule === 'Installments' ? parcelas : 1
    };
  }

  private formatDate(iso: string): string {
    const [yyyy, mm, dd] = (iso || '').split('T')[0].split('-');
    if (!yyyy || !mm || !dd) return '';
    return `${dd}/${mm}/${yyyy}`;
  }

  private formatMonth(iso: string): string {
    const [yyyy, mm] = (iso || '').split('T')[0].split('-');
    if (!yyyy || !mm) return '';
    return `${mm}/${yyyy}`;
  }

  private toIsoDate(ddmmyyyy: string): string | null {
    const digits = (ddmmyyyy || '').replace(/[^\d]/g, '');
    if (digits.length !== 8) return null;
    const dia = Number(digits.slice(0, 2));
    const mes = Number(digits.slice(2, 4));
    const ano = Number(digits.slice(4, 8));
    const date = new Date(Date.UTC(ano, mes - 1, dia));
    return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
  }

  private firstDayIso(mmYYYY?: string): string {
    const digits = (mmYYYY || '').replace(/[^\d]/g, '');
    if (digits.length < 6) return this.todayIso();
    const mes = Number(digits.slice(0, 2));
    const ano = Number(digits.slice(2, 6));
    const date = new Date(Date.UTC(ano, mes - 1, 1));
    return date.toISOString().slice(0, 10);
  }

  private todayIso(): string {
    return new Date().toISOString().slice(0, 10);
  }
}
