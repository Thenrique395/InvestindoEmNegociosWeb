import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, distinctUntilChanged, finalize, forkJoin, map, tap, throwError } from 'rxjs';
import { PlansService, Plan, CreatePlanPayload } from '../plans.service';
import { InstallmentsService, Installment } from '../installments.service';
import { CardsService, CardDto } from '../cards.service';
import { ScheduleType } from '../types/money-types';
import { InstallmentStatus, toInstallmentStatus } from '../types/money-types';
import { CategoriesService } from '../categories.service';
import { AuthService } from '../auth.service';
import { ReceitasSummaryService, IncomeMonthSummary, IncomeSummaryResponse } from '../receitas-summary.service';
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
  statementYear?: number | null;
  statementMonth?: number | null;
  statementCloseDate?: string | null;
  statementDueDate?: string | null;
  statementReference?: string | null;
}

export interface StoredCard {
  id: string;
  bandeira: string;
  numero: string;
  nome: string;
  holderName?: string;
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
  private readonly incomesLoadingSubject = new BehaviorSubject<boolean>(false);
  // Estado discreto de erro de carga (refresh de fundo). Não dispara toast; a UI
  // pode exibir um aviso sutil e o dado permanece o último carregado com sucesso.
  private readonly loadErrorSubject = new BehaviorSubject<boolean>(false);
  readonly incomeSummary$ = this.incomeSummarySubject.asObservable();
  readonly incomesLoading$ = this.incomesLoadingSubject.asObservable();
  readonly loadError$ = this.loadErrorSubject.asObservable();
  private lastIncomeMonth?: string;
  private refreshInFlight = false;
  private refreshIncomesInFlight = false;
  private lastRefreshAt = 0;
  private lastRefreshIncomesAt = 0;
  private incomePlansCache = new Map<string, Plan>();
  private incomeCategoriesCache = new Map<string, string>();
  private pendingIncomeMonth?: string;

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

  addExpense(expense: Omit<StoredExpense, 'id'>): Observable<void> {
    const payload = this.toPlanPayloadFromExpense(expense);
    return this.plans.create(payload).pipe(tap(() => this.refresh()), map(() => void 0));
  }

  updateExpense(_id: string, _data: Partial<StoredExpense>): Observable<void> {
    const current = this.dbSubject.value;
    const existing = current.expenses.find((e) => e.id === _id);
    const planId = _data.planId || existing?.planId;
    if (!planId) {
      return throwError(() => new Error('Não foi possível localizar o lançamento para atualizar.'));
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
    return this.plans.update(planId, payload).pipe(tap(() => this.refresh()), map(() => void 0));
  }

  updateExpenseInstallment(installmentId: string, data: Partial<StoredExpense>): Observable<void> {
    // Edita SOMENTE valor e vencimento da parcela in-place (preserva pagamentos/recibos).
    // Nome/categoria são do plano e mudam via edição da série inteira.
    const existing = this.dbSubject.value.expenses.find((e) => e.id === installmentId);
    const amount = data.valor ?? existing?.valor ?? 0;
    const dueDate = toIsoDateFromLocale(data.vencimento || existing?.vencimento || '');
    if (!dueDate) {
      return throwError(() => new Error('Data de vencimento inválida.'));
    }
    return this.installments.update(installmentId, { amount, dueDate }).pipe(tap(() => this.refresh()), map(() => void 0));
  }

  removeExpense(_id: string): Observable<void> {
    return this.removeExpenseInstallment(_id);
  }

  removeExpenseSeries(planId: string): Observable<void> {
    return this.plans.delete(planId).pipe(tap(() => this.refresh()), map(() => void 0));
  }

  removeExpenseInstallment(installmentId: string): Observable<void> {
    return this.installments.delete(installmentId).pipe(tap(() => this.refresh()), map(() => void 0));
  }

  addCard(card: Omit<StoredCard, 'id'>) {
    return this.cardsApi
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
      .pipe(
        tap(() => this.refresh(true))
      );
  }

  updateCard(id: string, data: Partial<StoredCard>) {
    return this.cardsApi
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
      .pipe(
        tap(() => this.refresh(true))
      );
  }

  removeCard(id: string): Observable<void> {
    return this.cardsApi.delete(id).pipe(tap(() => this.refresh()), map(() => void 0));
  }

  addIncome(income: Omit<StoredIncome, 'id'>): Observable<void> {
    const payload = this.toPlanPayloadFromIncome(income);
    return this.plans.create(payload).pipe(tap(() => this.refreshIncomes(this.lastIncomeMonth)), map(() => void 0));
  }

  updateIncome(planId: string, data: Partial<StoredIncome>): Observable<void> {
    const payload = this.toPlanPayloadFromIncome({
      planId,
      fonte: data.fonte || '',
      valor: data.valor ?? 0,
      recebimento: data.recebimento || '',
      fixa: data.fixa,
      fixaInicio: data.fixaInicio
    });

    return this.plans.update(planId, payload).pipe(tap(() => this.refreshIncomes(this.lastIncomeMonth)), map(() => void 0));
  }

  removeIncome(planId: string): Observable<void> {
    return this.plans.delete(planId).pipe(tap(() => this.refreshIncomes(this.lastIncomeMonth)), map(() => void 0));
  }

  removeIncomeInstallment(installmentId: string): Observable<void> {
    return this.installments.delete(installmentId).pipe(tap(() => this.refreshIncomes(this.lastIncomeMonth)), map(() => void 0));
  }

  markIncomeReceived(installmentId: string, amount: number, accountId?: string | null) {
    return this.installments.pay(installmentId, {
      paidAmount: amount,
      paidAt: new Date().toISOString(),
      methodId: null,
      note: null,
      accountId: accountId || null
    }).pipe(
      tap(() => {
        this.setIncomeStatusLocal(installmentId, 'PAID');
        this.refreshIncomes(this.lastIncomeMonth);
      })
    );
  }

  markExpensePaid(installmentId: string, amount: number, accountId?: string | null) {
    return this.installments.pay(installmentId, {
      paidAmount: amount,
      paidAt: new Date().toISOString(),
      methodId: null,
      note: null,
      accountId: accountId || null
    }).pipe(
      tap(() => {
        this.setExpenseStatusLocal(installmentId, 'PAID');
        this.refresh();
      })
    );
  }

  refresh(force = false): void {
    if (!this.authService.isAuthenticated()) {
      this.dbSubject.next({ expenses: [], cards: [], incomes: [] });
      this.incomeSummarySubject.next(null);
      return;
    }
    const now = Date.now();
    if (!force && (this.refreshInFlight || now - this.lastRefreshAt < 1500)) {
      return;
    }
    this.refreshInFlight = true;
    this.lastRefreshAt = now;
    forkJoin({
      incomePlans: this.plans.list('Income'),
      expensePlans: this.plans.list('Expense'),
      incomeInstallments: this.installments.list({ type: 'Income' }),
      expenseInstallments: this.installments.list({ type: 'Expense' }),
      cards: this.cardsApi.list(),
      // includeInactive: resolve o nome de categorias arquivadas no histórico dos lançamentos.
      expenseCategories: this.categoriesApi.list('Expense', undefined, true),
      incomeCategories: this.categoriesApi.list('Income', undefined, true)
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
        this.incomePlansCache = new Map(incomePlans.map((p) => [p.id, p]));
        this.incomeCategoriesCache = new Map(incomeCategoryMap);
        const incomes = this.mapIncomes(incomePlans, incomeInstallments, incomeCategoryMap);
        const expenses = this.mapExpenses(expensePlans, expenseInstallments, categoryMap);
        const mappedCards = this.mapCards(cards);
        this.dbSubject.next({ incomes, expenses, cards: mappedCards });
        this.loadErrorSubject.next(false);
      },
      error: () => {
        // Falha na carga de fundo: mantém o último dado bom e sinaliza estado de erro
        // discreto (sem toast). Reseta o in-flight para não travar refreshes futuros.
        this.loadErrorSubject.next(true);
        this.refreshInFlight = false;
      },
      complete: () => {
        this.refreshInFlight = false;
      }
    });
  }

  refreshIncomes(month?: string, force = false): void {
    if (!this.authService.isAuthenticated()) {
      this.dbSubject.next({ expenses: [], cards: [], incomes: [] });
      this.incomeSummarySubject.next(null);
       this.incomesLoadingSubject.next(false);
      return;
    }
    this.lastIncomeMonth = month;
    const currentSummaryMonth = this.incomeSummarySubject.value?.month;
    const monthChanged = (month || '') !== (currentSummaryMonth || '');

    if (this.refreshIncomesInFlight) {
      this.pendingIncomeMonth = month;
      // Mantém a UI em estado de carregamento contínuo quando o usuário troca de mês
      // enquanto uma requisição anterior ainda está em voo.
      this.incomesLoadingSubject.next(true);
      return;
    }

    const now = Date.now();
    if (!force && !monthChanged && now - this.lastRefreshIncomesAt < 1500) {
      return;
    }
    this.refreshIncomesInFlight = true;
    this.lastRefreshIncomesAt = now;
    this.incomesLoadingSubject.next(true);

    const current = this.dbSubject.value;
    const statusMap = new Map(current.incomes.map((income) => [income.id, income.status]));

    const isBasic = this.authService.getRole() === 'Basic';
    const summary$ = isBasic
      ? this.receitasSummary.getList(month).pipe(
          map((list): IncomeSummaryResponse => ({
            month: list.month,
            total: list.items.reduce((s, i) => s + i.amount, 0),
            totalRecurring: 0,
            totalOneTime: 0,
            items: list.items,
            previousMonth: null,
            history: []
          }))
        )
      : this.receitasSummary.getSummary(month);

    forkJoin({
      summary: summary$,
      incomeInstallments: this.installments.list({ type: 'Income' })
    })
      .pipe(
        finalize(() => {
          this.refreshIncomesInFlight = false;
          if (this.pendingIncomeMonth !== undefined) {
            const nextMonth = this.pendingIncomeMonth;
            this.pendingIncomeMonth = undefined;
            this.refreshIncomes(nextMonth, true);
            return;
          }
          this.incomesLoadingSubject.next(false);
        })
      )
      .subscribe({
      next: ({ summary, incomeInstallments }) => {
        const currentState = this.dbSubject.value;
        const installmentStatusMap = new Map(
          (incomeInstallments || []).map((inst) => [
            inst.id,
            toInstallmentStatus(inst.status)
          ])
        );
        const previousById = new Map(currentState.incomes.map((income) => [income.id, income]));

        const incomes: StoredIncome[] = summary.items.map((item) => {
          const previous = previousById.get(item.id);
          const plan = this.incomePlansCache.get(item.planId);
          const categoryId = previous?.categoryId ?? plan?.categoryId ?? null;
          return {
            id: item.id,
            planId: item.planId,
            fonte: item.source,
            categoria:
              previous?.categoria ||
              this.incomeCategoriesCache.get(categoryId || '') ||
              'Sem categoria',
            categoryId,
            valor: item.amount,
            recebimento: this.normalizeSummaryDate(item.receivedOn),
            schedule: previous?.schedule ?? item.schedule,
            startDateIso: previous?.startDateIso ?? item.startDateIso,
            fixa: previous?.fixa ?? item.isRecurring,
            fixaInicio: (previous?.fixaInicio ?? item.recurringStart) || '',
            status: installmentStatusMap.get(item.id) || statusMap.get(item.id) || 'OPEN'
          };
        });

        this.dbSubject.next({ incomes, expenses: currentState.expenses, cards: currentState.cards });
        this.incomeSummarySubject.next({
          month: summary.month,
          total: summary.total,
          totalRecurring: summary.totalRecurring,
          totalOneTime: summary.totalOneTime,
          previousMonth: summary.previousMonth ?? null,
          history: summary.history ?? []
        });
        this.enrichIncomeMetadataInBackground();
        this.loadErrorSubject.next(false);
      },
      error: () => {
        // Carga de receitas de fundo falhou: sinaliza erro discreto (sem toast).
        this.loadErrorSubject.next(true);
      }
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

  setExpenseStatusLocal(installmentId: string, status: InstallmentStatus): void {
    const current = this.dbSubject.value;
    if (!current.expenses.length) return;
    const expenses = current.expenses.map((expense) =>
      expense.id === installmentId ? { ...expense, status } : expense
    );
    this.dbSubject.next({ incomes: current.incomes, expenses, cards: current.cards });
  }

  private enrichIncomeMetadataInBackground(): void {
    const current = this.dbSubject.value;
    if (!current.incomes.length) return;
    const hasMissingMetadata = current.incomes.some(
      (income) =>
        !income.schedule ||
        !income.startDateIso ||
        income.categoryId == null ||
        !income.categoria ||
        income.categoria === 'Sem categoria'
    );
    if (!hasMissingMetadata && this.incomePlansCache.size > 0 && this.incomeCategoriesCache.size > 0) {
      return;
    }

    forkJoin({
      incomePlans: this.plans.list('Income'),
      incomeCategories: this.categoriesApi.list('Income', undefined, true)
    }).subscribe({
      next: ({ incomePlans, incomeCategories }) => {
        this.incomePlansCache = new Map(incomePlans.map((p) => [p.id, p]));
        this.incomeCategoriesCache = new Map(
          incomeCategories
            .filter((c) => {
              const applies = (c.appliesTo || '').toString().toLowerCase();
              return applies === 'income' || applies === 'receita' || applies === 'receitas';
            })
            .map((c) => [c.id, c.name])
        );

        const currentState = this.dbSubject.value;
        if (!currentState.incomes.length) return;

        const incomes = currentState.incomes.map((income) => {
          const plan = income.planId ? this.incomePlansCache.get(income.planId) : undefined;
          const categoryId = income.categoryId ?? plan?.categoryId ?? null;
          return {
            ...income,
            categoryId,
            categoria: this.incomeCategoriesCache.get(categoryId || '') || income.categoria || 'Sem categoria',
            schedule: income.schedule ?? plan?.schedule,
            startDateIso: income.startDateIso ?? plan?.startDate,
            fixa: income.fixa ?? (plan?.schedule === 'Recurring'),
            fixaInicio:
              income.fixaInicio ||
              (plan?.schedule === 'Recurring' ? this.formatMonth(plan.startDate) : '')
          };
        });

        this.dbSubject.next({ incomes, expenses: currentState.expenses, cards: currentState.cards });
      },
      error: () => {
        /* não bloqueia renderização inicial */
      }
    });
  }

  private mapIncomes(plans: Plan[], installments: Installment[], categoryMap?: Map<string, string>): StoredIncome[] {
    const lookup = new Map(plans.map((p) => [p.id, p]));
    return installments.map((inst) => {
      const plan = lookup.get(inst.planId);
      const categoryId = plan?.categoryId ?? null;
      const categoria = categoryMap?.get(categoryId || '') || 'Sem categoria';
      const rawStatus = inst.status || '';
      const status = toInstallmentStatus(rawStatus);
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
      const categoryId = plan?.categoryId ?? null;
      const categoria = categoryMap.get(categoryId || '') || 'Outros';
      const isSeries = (plan?.installmentsCount ?? 0) > 1;
      const isRecurring = plan?.schedule === 'Recurring';
      const rawStatus = inst.status || '';
      const status = toInstallmentStatus(rawStatus);
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
        status: status || 'OPEN',
        statementYear: inst.statementYear ?? null,
        statementMonth: inst.statementMonth ?? null,
        statementCloseDate: inst.statementCloseDate ?? null,
        statementDueDate: inst.statementDueDate ?? null,
        statementReference: inst.statementReference ?? null
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
    const amount = expense.valor;

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

  private normalizeSummaryDate(value: string): string {
    const raw = (value || '').trim();
    const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
    if (iso) {
      return formatLocaleDateFromIso(raw);
    }
    const br = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(raw);
    if (!br) return raw;
    const day = Number(br[1]);
    const month = Number(br[2]);
    const year = Number(br[3]);
    if (!day || !month || !year) return raw;
    const date = new Date(year, month - 1, day);
    if (Number.isNaN(date.getTime())) return raw;
    return formatLocaleDateFromIso(
      `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    );
  }

  private todayIso(): string {
    return new Date().toISOString().slice(0, 10);
  }
}
