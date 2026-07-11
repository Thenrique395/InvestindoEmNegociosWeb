import { computed, Injectable, signal } from '@angular/core';
import { catchError, finalize, forkJoin, of } from 'rxjs';
import {
  AccountRequest,
  AccountResponse,
  AccountTransferRequest,
  AccountTransferResponse,
  AccountTransactionResponse,
  AccountsService,
  CsvExtractResponse,
  OfxExtractResponse,
  OfxImportRequest,
  OfxImportResult,
  PagedResult,
  RealAvailableBalanceResponse
} from './accounts.service';
import { AccountActivity, AccountPeriod, buildActivityMap, periodRange } from './contas/accounts-overview.model';

type AccountsState = {
  data: AccountResponse[];
  loading: boolean;
  loaded: boolean;
  error: string | null;
};

type TransactionsState = {
  accountId: string | null;
  data: AccountTransactionResponse[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  loading: boolean;
  error: string | null;
};

type TransactionFilter = {
  fromUtc?: string;
  toUtc?: string;
  page?: number;
  pageSize?: number;
};

const initialAccountsState = (): AccountsState => ({
  data: [],
  loading: false,
  loaded: false,
  error: null
});

const initialTransactionsState = (): TransactionsState => ({
  accountId: null,
  data: [],
  totalCount: 0,
  page: 1,
  pageSize: 50,
  totalPages: 0,
  hasNextPage: false,
  loading: false,
  error: null
});

@Injectable({ providedIn: 'root' })
export class AccountsStore {
  private readonly accountsState = signal<AccountsState>(initialAccountsState());
  private readonly transactionsState = signal<TransactionsState>(initialTransactionsState());
  private selectedAccountIdState = signal<string | null>(null);
  private currentTransactionFilter: TransactionFilter = {};

  private readonly realBalanceState = signal<{ data: RealAvailableBalanceResponse | null; loading: boolean }>({ data: null, loading: false });
  private readonly activityState = signal<{ data: Record<string, AccountActivity>; loading: boolean }>({ data: {}, loading: false });
  private readonly defaultAccountIdState = signal<string | null>(null);

  readonly accounts = computed(() => this.accountsState().data);
  readonly loading = computed(() => this.accountsState().loading);
  readonly loaded = computed(() => this.accountsState().loaded);
  readonly error = computed(() => this.accountsState().error);

  readonly selectedAccountId = computed(() => this.selectedAccountIdState());
  readonly selectedAccount = computed(() => {
    const selectedId = this.selectedAccountIdState();
    return this.accountsState().data.find((account) => account.id === selectedId) ?? null;
  });

  readonly transactions = computed(() => this.transactionsState().data);
  readonly transactionsTotalCount = computed(() => this.transactionsState().totalCount);
  readonly transactionsPage = computed(() => this.transactionsState().page);
  readonly transactionsPageSize = computed(() => this.transactionsState().pageSize);
  readonly transactionsTotalPages = computed(() => this.transactionsState().totalPages);
  readonly transactionsHasNextPage = computed(() => this.transactionsState().hasNextPage);
  readonly transactionsLoading = computed(() => this.transactionsState().loading);
  readonly transactionsError = computed(() => this.transactionsState().error);

  readonly realBalance = computed(() => this.realBalanceState().data);
  readonly realBalanceLoading = computed(() => this.realBalanceState().loading);
  readonly accountsActivity = computed(() => this.activityState().data);
  readonly accountsActivityLoading = computed(() => this.activityState().loading);
  readonly defaultAccountId = computed(() => this.defaultAccountIdState());

  constructor(private accountsService: AccountsService) {}

  /** Saldo disponível real (endpoint de resumo). Tolerante a falha/plano. */
  loadRealBalance(period: AccountPeriod = 'month'): void {
    this.realBalanceState.set({ data: this.realBalanceState().data, loading: true });
    this.accountsService.getRealAvailableBalance(period)
      .pipe(finalize(() => this.realBalanceState.update((s) => ({ ...s, loading: false }))))
      .subscribe({
        next: (data) => this.realBalanceState.set({ data, loading: false }),
        error: () => this.realBalanceState.set({ data: null, loading: false })
      });
  }

  /** Atividade por conta (entradas/saídas/contagem) a partir das transações reais do período. */
  loadAccountsActivity(period: AccountPeriod = 'month'): void {
    const active = this.accountsState().data.filter((account) => account.isActive);
    if (!active.length) {
      this.activityState.set({ data: {}, loading: false });
      return;
    }

    const { fromUtc, toUtc } = periodRange(period);
    this.activityState.set({ data: this.activityState().data, loading: true });

    const requests = active.map((account) =>
      this.accountsService.listTransactions(account.id, { fromUtc, toUtc }).pipe(catchError(() => of([] as AccountTransactionResponse[])))
    );

    forkJoin(requests)
      .pipe(finalize(() => this.activityState.update((s) => ({ ...s, loading: false }))))
      .subscribe({
        next: (results) => {
          const byAccount: Record<string, AccountTransactionResponse[]> = {};
          active.forEach((account, index) => {
            byAccount[account.id] = results[index] || [];
          });
          this.activityState.set({ data: buildActivityMap(byAccount), loading: false });
        },
        error: () => this.activityState.set({ data: {}, loading: false })
      });
  }

  /** Define a conta principal (default account) preservando a regra existente. */
  setDefaultAccount(accountId: string | null): void {
    this.accountsService.setDefaultAccountId(accountId);
    this.defaultAccountIdState.set(accountId);
  }

  load(force = false): void {
    const current = this.accountsState();
    if (!force && (current.loading || current.loaded)) return;

    this.patchAccounts({ loading: true, error: null });
    this.accountsService.list()
      .pipe(finalize(() => this.patchAccounts({ loading: false })))
      .subscribe({
        next: (data) => {
          const accounts = data || [];
          this.accountsState.set({ data: accounts, loading: false, loaded: true, error: null });
          this.defaultAccountIdState.set(this.accountsService.resolveDefaultAccountId(accounts));
          this.syncSelectedAccount(accounts);
        },
        error: () => this.patchAccounts({ error: 'Falha ao carregar contas.' })
      });
  }

  refresh(): void {
    this.accountsState.set(initialAccountsState());
    this.load(true);
  }

  selectAccount(accountId: string | null): void {
    this.selectedAccountIdState.set(accountId);
    if (!accountId) {
      this.transactionsState.set(initialTransactionsState());
    }
  }

  loadTransactions(accountId = this.selectedAccountIdState(), filter: TransactionFilter = {}): void {
    if (!accountId) {
      this.transactionsState.set(initialTransactionsState());
      return;
    }

    this.currentTransactionFilter = filter;
    const page = filter.page ?? 1;
    const pageSize = filter.pageSize ?? 50;
    this.transactionsState.set({ accountId, data: [], totalCount: 0, page, pageSize, totalPages: 0, hasNextPage: false, loading: true, error: null });
    this.accountsService.listTransactionsPaged(accountId, { ...filter, page, pageSize })
      .pipe(finalize(() => this.patchTransactions({ loading: false })))
      .subscribe({
        next: (paged: PagedResult<AccountTransactionResponse>) => this.transactionsState.set({
          accountId,
          data: paged.items || [],
          totalCount: paged.totalCount,
          page: paged.page,
          pageSize: paged.pageSize,
          totalPages: paged.totalPages,
          hasNextPage: paged.hasNextPage,
          loading: false,
          error: null
        }),
        error: () => this.patchTransactions({ error: 'Falha ao carregar extrato da conta.' })
      });
  }

  create(payload: AccountRequest, onSuccess?: () => void): void {
    this.patchAccounts({ error: null });
    this.accountsService.create(payload).subscribe({
      next: () => {
        this.refresh();
        onSuccess?.();
      },
      error: () => this.patchAccounts({ error: 'Falha ao salvar conta.' })
    });
  }

  update(id: string, payload: AccountRequest, onSuccess?: () => void): void {
    this.patchAccounts({ error: null });
    this.accountsService.update(id, payload).subscribe({
      next: () => {
        this.refresh();
        onSuccess?.();
      },
      error: () => this.patchAccounts({ error: 'Falha ao salvar conta.' })
    });
  }

  delete(id: string, onSuccess?: () => void): void {
    this.patchAccounts({ error: null });
    this.accountsService.delete(id).subscribe({
      next: () => {
        if (this.selectedAccountIdState() === id) {
          this.selectAccount(null);
        }
        this.refresh();
        onSuccess?.();
      },
      error: () => this.patchAccounts({ error: 'Falha ao remover conta.' })
    });
  }

  transfer(payload: AccountTransferRequest, onSuccess?: (response: AccountTransferResponse) => void): void {
    this.patchAccounts({ error: null });
    this.accountsService.transfer(payload).subscribe({
      next: (response) => {
        this.refresh();
        if (this.selectedAccountIdState() === payload.fromAccountId || this.selectedAccountIdState() === payload.toAccountId) {
          this.loadTransactions(this.selectedAccountIdState(), this.currentTransactionFilter);
        }
        onSuccess?.(response);
      },
      error: () => this.patchAccounts({ error: 'Falha ao transferir entre contas.' })
    });
  }

  extractOfx(file: File, accountId?: string | null) {
    return this.accountsService.extractOfx(file, accountId);
  }

  importOfx(payload: OfxImportRequest, onSuccess?: (response: OfxImportResult) => void): void {
    this.accountsService.importOfx(payload).subscribe({
      next: (response) => {
        this.refresh();
        this.loadTransactions(payload.accountId, this.currentTransactionFilter);
        onSuccess?.(response);
      },
      error: () => this.patchAccounts({ error: 'Falha ao importar OFX.' })
    });
  }

  extractCsv(file: File, accountId?: string | null) {
    return this.accountsService.extractCsv(file, accountId);
  }

  importCsv(payload: OfxImportRequest, onSuccess?: (response: OfxImportResult) => void): void {
    this.accountsService.importCsv(payload).subscribe({
      next: (response) => {
        this.refresh();
        this.loadTransactions(payload.accountId, this.currentTransactionFilter);
        onSuccess?.(response);
      },
      error: () => this.patchAccounts({ error: 'Falha ao importar CSV.' })
    });
  }

  private patchAccounts(patch: Partial<AccountsState>): void {
    this.accountsState.update((state) => ({ ...state, ...patch }));
  }

  private patchTransactions(patch: Partial<TransactionsState>): void {
    this.transactionsState.update((state) => ({ ...state, ...patch }));
  }

  private syncSelectedAccount(accounts: AccountResponse[]): void {
    const selectedId = this.selectedAccountIdState();
    if (selectedId && accounts.some((account) => account.id === selectedId)) {
      return;
    }

    const nextSelected = accounts.find((account) => account.isActive)?.id ?? accounts[0]?.id ?? null;
    this.selectedAccountIdState.set(nextSelected);

    if (!nextSelected) {
      this.transactionsState.set(initialTransactionsState());
    }
  }
}
