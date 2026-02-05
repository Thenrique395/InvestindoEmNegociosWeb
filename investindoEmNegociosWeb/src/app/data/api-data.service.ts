import { Injectable } from '@angular/core';
import { BehaviorSubject, distinctUntilChanged, forkJoin, map, switchMap, tap } from 'rxjs';
import { PlansService, Plan, CreatePlanPayload } from '../plans.service';
import { InstallmentsService, Installment } from '../installments.service';
import { CardsService, CardDto } from '../cards.service';
import { ScheduleType } from '../types/money-types';
import { InstallmentStatus } from '../types/money-types';
import { CategoriesService } from '../categories.service';
import { AuthService } from '../auth.service';
import { ReceitasSummaryService, IncomeMonthSummary } from '../receitas-summary.service';
import { formatLocaleDateFromIso, toIsoDateFromLocale } from '../utils/locale-utils';

export interface StoredExpense {
  id: string;
  planId?: string;
  nome: string;
  categoria: string;
  categoryId?: string | null;
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
  userId?: string;
}

export interface StoredIncome {
  id: string;
  planId?: string;
  fonte: string;
  categoria?: string;
  categoryId?: string | null;
  valor: number;
  recebimento: string; // DD/MM/AAAA
  schedule?: ScheduleType;
  startDateIso?: string;
  fixa?: boolean;
  fixaInicio?: string; // MM/AAAA
  userId?: string;
  status?: InstallmentStatus;
}

export interface IncomeSummaryState {
  month: string;
  total: number;
  totalRecurring: number;
  totalOneTime: number;
  previousMonth?: IncomeMonthSummary | null;
  history: IncomeMonthSummary[];
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
  private readonly incomeSummarySubject = new BehaviorSubject<IncomeSummaryState | null>(null);
  readonly incomeSummary$ = this.incomeSummarySubject.asObservable();
  private lastIncomeMonth?: string;

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

  constructor(
    private plans: PlansService,
    private installments: InstallmentsService,
    private cardsApi: CardsService,
    private categoriesApi: CategoriesService,
    private authService: AuthService,
    private receitasSummary: ReceitasSummaryService
  ) {
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
    const current = this.dbSubject.value;
    const existing = current.expenses.find((e) => e.id === _id);
    const planId = _data.planId || existing?.planId;
    if (!planId) {
      console.warn('Update de despesa ignorado: planId não encontrado.');
      return;
    }

    const merged: Omit<StoredExpense, 'id'> = {
      ...(existing || {
        nome: '',
        categoria: '',
        valor: 0,
        vencimento: ''
      }),
      ..._data,
      planId
    };

    const payload = this.toPlanPayloadFromExpense(merged);
    this.plans.update(planId, payload).subscribe({
      next: () => this.refresh(),
      error: (err) => console.error('Falha ao atualizar despesa', err)
    });
  }

  updateExpenseInstallment(installmentId: string, data: Partial<StoredExpense>): void {
    const current = this.dbSubject.value;
    const existing = current.expenses.find((e) => e.id === installmentId);
    const merged: Omit<StoredExpense, 'id'> = {
      ...(existing || {
        nome: '',
        categoria: '',
        valor: 0,
        vencimento: ''
      }),
      ...data,
      fixa: false,
      parcelasTotal: 1,
      serieId: undefined
    };

    const payload = this.toPlanPayloadFromExpense(merged);
    this.installments
      .delete(installmentId)
      .pipe(switchMap(() => this.plans.create(payload)))
      .subscribe({
        next: () => this.refresh(),
        error: (err) => console.error('Falha ao atualizar parcela de despesa', err)
      });
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
      next: () => this.refreshIncomes(this.lastIncomeMonth),
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
      next: () => this.refreshIncomes(this.lastIncomeMonth),
      error: (err) => console.error('Falha ao atualizar receita', err)
    });
  }

  removeIncome(planId: string): void {
    this.plans.delete(planId).subscribe({
      next: () => this.refreshIncomes(this.lastIncomeMonth),
      error: (err) => console.error('Falha ao remover receita', err)
    });
  }

  removeIncomeInstallment(installmentId: string): void {
    this.installments.delete(installmentId).subscribe({
      next: () => this.refreshIncomes(this.lastIncomeMonth),
      error: (err) => console.error('Falha ao remover parcela de receita', err)
    });
  }

  markIncomeReceived(installmentId: string, amount: number) {
    return this.installments.pay(installmentId, {
      paidAmount: amount,
      paidAt: new Date().toISOString(),
      methodId: null,
      note: null
    }).pipe(
      tap(() => {
        this.setIncomeStatusLocal(installmentId, 'PAID');
        this.refreshIncomes(this.lastIncomeMonth);
      })
    );
  }

  refresh(): void {
    if (!this.authService.getAccessToken()) {
      this.dbSubject.next({ expenses: [], cards: [], incomes: [] });
      this.incomeSummarySubject.next(null);
      return;
    }
    forkJoin({
      incomePlans: this.plans.list('Income'),
      expensePlans: this.plans.list('Expense'),
      incomeInstallments: this.installments.list({ type: 'Income' }),
      expenseInstallments: this.installments.list({ type: 'Expense' }),
      cards: this.cardsApi.list(),
      expenseCategories: this.categoriesApi.list('Expense'),
      incomeCategories: this.categoriesApi.list()
    }).subscribe({
      next: ({
        incomePlans,
        expensePlans,
        incomeInstallments,
        expenseInstallments,
        cards,
        expenseCategories,
        incomeCategories
      }) => {
        const categoryMap = new Map(
          expenseCategories
            .filter((c) => {
              const applies = (c.appliesTo || '').toString().toLowerCase();
              return applies === 'expense' || applies === 'despesa' || applies === 'despesas';
            })
            .map((c) => [c.id, c.name])
        );
        const incomeCategoryMap = new Map(
          incomeCategories
            .filter((c) => {
              const applies = (c.appliesTo || '').toString().toLowerCase();
              return applies === 'income' || applies === 'receita' || applies === 'receitas';
            })
            .map((c) => [c.id, c.name])
        );
        const incomes = this.mapIncomes(incomePlans, incomeInstallments, incomeCategoryMap);
        const expenses = this.mapExpenses(expensePlans, expenseInstallments, categoryMap);
        const mappedCards = this.mapCards(cards);
        this.dbSubject.next({ incomes, expenses, cards: mappedCards });
      },
      error: (err) => console.error('Falha ao carregar dados do backend', err)
    });
  }

  refreshIncomes(month?: string): void {
    if (!this.authService.getAccessToken()) {
      this.dbSubject.next({ expenses: [], cards: [], incomes: [] });
      this.incomeSummarySubject.next(null);
      return;
    }
    this.lastIncomeMonth = month;

    const current = this.dbSubject.value;
    const statusMap = new Map(current.incomes.map((income) => [income.id, income.status]));

    forkJoin({
      summary: this.receitasSummary.getSummary(month),
      incomePlans: this.plans.list('Income'),
      incomeCategories: this.categoriesApi.list()
    }).subscribe({
      next: ({ summary, incomePlans, incomeCategories }) => {
        const planMap = new Map(incomePlans.map((p) => [p.id, p]));
        const categoryMap = new Map(
          incomeCategories
            .filter((c) => {
              const applies = (c.appliesTo || '').toString().toLowerCase();
              return applies === 'income' || applies === 'receita' || applies === 'receitas';
            })
            .map((c) => [c.id, c.name])
        );

        const incomes: StoredIncome[] = summary.items.map((item) => {
          const plan = planMap.get(item.planId);
          const categoryId = plan?.categoryId ?? null;
          return {
            id: item.id,
            planId: item.planId,
            fonte: item.source,
            categoria: categoryMap.get(categoryId || '') || 'Sem categoria',
            categoryId,
            valor: item.amount,
            recebimento: item.receivedOn,
            schedule: item.schedule,
            startDateIso: item.startDateIso,
            fixa: item.isRecurring,
            fixaInicio: item.recurringStart || ''
          };
        });

        const merged = incomes.map((income) => ({
          ...income,
          status: statusMap.get(income.id) || income.status || 'OPEN'
        }));
        this.dbSubject.next({ incomes: merged, expenses: current.expenses, cards: current.cards });
        this.incomeSummarySubject.next({
          month: summary.month,
          total: summary.total,
          totalRecurring: summary.totalRecurring,
          totalOneTime: summary.totalOneTime,
          previousMonth: summary.previousMonth ?? null,
          history: summary.history ?? []
        });
      },
      error: (err) => console.error('Falha ao carregar receitas do backend', err)
    });
  }

  setIncomeStatusLocal(installmentId: string, status: InstallmentStatus): void {
    const current = this.dbSubject.value;
    if (!current.incomes.length) return;
    const incomes = current.incomes.map((income) =>
      income.id === installmentId ? { ...income, status } : income
    );
    this.dbSubject.next({ incomes, expenses: current.expenses, cards: current.cards });
  }

  private mapIncomes(plans: Plan[], installments: Installment[], categoryMap?: Map<string, string>): StoredIncome[] {
    const lookup = new Map(plans.map((p) => [p.id, p]));
    return installments.map((inst) => {
      const plan = lookup.get(inst.planId);
      const categoryId = plan?.categoryId ?? null;
      const categoria = categoryMap?.get(categoryId || '') || 'Sem categoria';
      const rawStatus = (inst as any)?.status || '';
      const status = (rawStatus || '').toString().toUpperCase() as InstallmentStatus;
      return {
        id: inst.id,
        planId: inst.planId,
        fonte: plan?.title || 'Receita',
        categoria,
        categoryId,
        valor: inst.amount,
        recebimento: this.formatDate(inst.dueDate),
        schedule: plan?.schedule,
        startDateIso: plan?.startDate,
        fixa: plan?.schedule === 'Recurring',
        fixaInicio: plan?.schedule === 'Recurring' ? this.formatMonth(plan.startDate) : '',
        userId: plan?.userId,
        status: status || 'OPEN'
      };
    });
  }

  private mapExpenses(
    plans: Plan[],
    installments: Installment[],
    categoryMap: Map<string, string>
  ): StoredExpense[] {
    const lookup = new Map(plans.map((p) => [p.id, p]));
    return installments.map((inst) => {
      const plan = lookup.get(inst.planId);
      const categoryId = (plan as any)?.categoryId ?? (plan as any)?.CategoryId ?? null;
      const categoria = categoryMap.get(categoryId || '') || 'Outros';
      const isSeries = (plan?.installmentsCount ?? 0) > 1;
      const isRecurring = plan?.schedule === 'Recurring';
      const rawStatus = (inst as any)?.status || '';
      const status = (rawStatus || '').toString().toUpperCase() as InstallmentStatus;
      return {
        id: inst.id,
        planId: plan?.id,
        nome: plan?.title || 'Despesa',
        categoria,
        categoryId,
        valor: inst.amount,
        vencimento: this.formatDate(inst.dueDate),
        userId: plan?.userId,
        cartao: plan?.cardId || undefined,
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
    const startDate = this.toIsoDate(income.recebimento) || this.todayIso();

    return {
      type: 'Income',
      title: income.fonte,
      amount: income.valor,
      schedule,
      startDate,
      categoryId: income.categoryId ?? null,
      frequency: schedule === 'Recurring' ? 'Monthly' : null,
      installmentsCount: schedule === 'OneTime' ? 1 : null,
      cardId: null
    };
  }

  private toPlanPayloadFromExpense(expense: Omit<StoredExpense, 'id'>): CreatePlanPayload {
    const startDate = this.toIsoDate(expense.vencimento) || this.todayIso();
    const categoryId = expense.categoryId ?? null;

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
      installmentsCount: schedule === 'Installments' ? months : null,
      cardId: expense.cartao || null
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
      installmentsCount: schedule === 'Installments' ? parcelas : 1,
      cardId: expense.cartao || null
    };
  }

  private formatDate(iso: string): string {
    return formatLocaleDateFromIso(iso);
  }

  private formatMonth(iso: string): string {
    const [yyyy, mm] = (iso || '').split('T')[0].split('-');
    if (!yyyy || !mm) return '';
    return `${mm}/${yyyy}`;
  }

  private toIsoDate(ddmmyyyy: string): string | null {
    return toIsoDateFromLocale(ddmmyyyy);
  }

  private todayIso(): string {
    return new Date().toISOString().slice(0, 10);
  }
}
