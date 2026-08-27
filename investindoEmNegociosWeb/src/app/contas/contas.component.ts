import { Component, DestroyRef, effect, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SelectMenuComponent } from '../shared/select-menu/select-menu.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  AccountRequest,
  AccountResponse,
  AccountTransferRequest,
  AccountTransactionResponse,
  AccountType,
  CsvExtractResponse,
  OfxExtractResponse
} from '../accounts.service';
import { CategoriesService, CategoryDto } from '../categories.service';
import { AccountsStore } from '../accounts.store';
import { SectionCardComponent } from '../shared/section-card/section-card.component';
import { EmptyStateComponent } from '../empty-state/empty-state.component';
import { UiStateComponent } from '../ui-state/ui-state.component';
import { AccountFormComponent } from '../features/accounts/components/account-form/account-form.component';
import { extractApiErrorMessage } from '../utils/api-error.utils';
import { AccountListComponent } from '../features/accounts/components/account-list/account-list.component';
import { AccountTransferComponent, AccountTransferFormValue } from '../features/accounts/components/account-transfer/account-transfer.component';
import { AccountImportComponent } from '../features/accounts/components/account-import/account-import.component';
import { AccountMovementsListComponent } from '../features/accounts/components/account-movements/account-movements-list.component';
import { AppCurrencyPipe } from '../shared/app-currency.pipe';
import { PageHeaderComponent } from '../shared/page-header/page-header.component';
import { TransactionSummaryCardComponent } from '../shared/transactions/transaction-summary-card.component';
import { SegmentedSelectorComponent, SegmentOption } from '../shared/segmented-selector/segmented-selector.component';
import { DonutChartComponent } from '../shared/donut-chart/donut-chart.component';
import { UiPermissionsService } from '../ui-permissions.service';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import {
  AccountPeriod,
  AccountSort,
  AccountsFilters,
  AccountsOverview,
  buildAccountsOverview,
  filterAccounts,
  sortAccounts
} from './accounts-overview.model';

@Component({
  selector: 'app-contas',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AccountFormComponent,
    AccountListComponent,
    AccountTransferComponent,
    AccountImportComponent,
    AccountMovementsListComponent,
    SectionCardComponent,
    EmptyStateComponent,
    UiStateComponent,
    AppCurrencyPipe,
    PageHeaderComponent,
    TransactionSummaryCardComponent,
    SegmentedSelectorComponent,
    DonutChartComponent,
    ConfirmDialogComponent,
    SelectMenuComponent
  ],
  templateUrl: './contas.component.html',
  styleUrls: ['./contas.component.scss']
})
export class ContasComponent implements OnInit {
  loading = false;
  saving = false;
  error = '';
  accountToRemove: AccountResponse | null = null;

  accounts: AccountResponse[] = [];
  selectedAccountId: string | null = null;
  transactions: AccountTransactionResponse[] = [];
  transactionsTotalCount = 0;
  transactionsPage = 1;
  transactionsPageSize = 50;
  transactionsTotalPages = 0;
  transactionsHasNextPage = false;
  loadingTransactions = false;

  fromInput = '';
  toInput = '';

  transferForm: AccountTransferFormValue = this.createEmptyTransferForm();
  transferring = false;

  importingOfx = false;
  extractingOfx = false;
  ofxFileName = '';
  ofxSkipDuplicates = true;
  ofxRawText = '';
  ofxExtract: OfxExtractResponse = { items: [], rawText: '' };

  importingCsv = false;
  extractingCsv = false;
  csvFileName = '';
  csvSkipDuplicates = true;
  csvRawText = '';
  csvExtract: CsvExtractResponse = { delimiter: ';', detectedColumns: [], items: [], rawText: '' };

  categories: CategoryDto[] = [];

  editingId: string | null = null;
  form: AccountRequest = this.createEmptyForm();

  readonly accountTypes: AccountType[] = ['Checking', 'Savings', 'DigitalWallet', 'Cash', 'Other'];

  // Central de Contas — período, filtros e ordenação
  period: AccountPeriod = 'month';
  filters: AccountsFilters = { search: '', type: 'all', status: 'all', balance: 'all' };
  sort: AccountSort = 'primary';
  showManageWorkspace = false;
  readonly canAdvanced: boolean;

  private lastActivityKey = '';

  constructor(
    private readonly accountsStore: AccountsStore,
    private readonly categoriesService: CategoriesService,
    private readonly uiPermissions: UiPermissionsService,
    private readonly destroyRef: DestroyRef
  ) {
    this.canAdvanced = this.uiPermissions.canUseAdvancedAccountAnalysis();

    effect(() => {
      this.accounts = this.accountsStore.accounts();
      this.loading = this.accountsStore.loading();
      this.error = this.accountsStore.error() || this.error;
      if (this.accountsStore.error()) {
        this.saving = false;
        this.transferring = false;
        this.importingOfx = false;
        this.importingCsv = false;
      }
      this.selectedAccountId = this.accountsStore.selectedAccountId();
      this.syncTransferDefaults();
    });

    effect(() => {
      this.transactions = this.accountsStore.transactions();
      this.transactionsTotalCount = this.accountsStore.transactionsTotalCount();
      this.transactionsPage = this.accountsStore.transactionsPage();
      this.transactionsPageSize = this.accountsStore.transactionsPageSize();
      this.transactionsTotalPages = this.accountsStore.transactionsTotalPages();
      this.transactionsHasNextPage = this.accountsStore.transactionsHasNextPage();
      this.loadingTransactions = this.accountsStore.transactionsLoading();
      this.error = this.accountsStore.transactionsError() || this.error;
    });

    // Recarrega a atividade por conta quando o conjunto de contas muda.
    effect(
      () => {
        const key = this.accountsStore.accounts().map((account) => account.id).sort().join(',');
        if (key && key !== this.lastActivityKey) {
          this.lastActivityKey = key;
          this.accountsStore.loadAccountsActivity(this.period);
        }
      },
      { allowSignalWrites: true }
    );
  }

  ngOnInit(): void {
    this.loadAccounts();
    this.loadCategories();
    this.accountsStore.loadRealBalance(this.period);
  }

  // ---- Derivações (Central de Contas) ---------------------------------------

  get activityMap() {
    return this.accountsStore.accountsActivity();
  }

  get defaultAccountId(): string | null {
    return this.accountsStore.defaultAccountId();
  }

  get realBalance() {
    return this.accountsStore.realBalance();
  }

  get overview(): AccountsOverview {
    return buildAccountsOverview(this.accounts, this.activityMap, this.defaultAccountId);
  }

  get filteredAccounts(): AccountResponse[] {
    return sortAccounts(filterAccounts(this.accounts, this.filters), this.sort, this.activityMap, this.defaultAccountId);
  }

  get availableBalance(): number {
    const real = this.realBalance;
    return real ? real.realAvailableBalance : this.overview.totalBalance;
  }

  get reservedAmount(): number {
    return this.realBalance?.pendingExpensesAmount ?? 0;
  }

  get availableNote(): string {
    if (this.availableBalance < 0) return 'Compromissos em aberto superam o saldo — atenção.';
    if (this.reservedAmount > 0) return 'Já descontando compromissos em aberto do período.';
    return 'Sem compromissos em aberto no período.';
  }

  get availableTone(): 'info' | 'warning' {
    return this.availableBalance < 0 ? 'warning' : 'info';
  }

  get forecastAmount(): number {
    return this.realBalance?.pendingIncomesAmount ?? 0;
  }

  get overdueAmount(): number {
    return this.realBalance?.overdueExpensesAmount ?? 0;
  }

  get overdueCount(): number {
    return this.realBalance?.overdueExpensesCount ?? 0;
  }

  get projectedAvailable(): number {
    return this.realBalance?.projectedAvailableBalance ?? this.availableBalance;
  }

  /** Mostra o painel lateral quando há dados de disponibilidade ou distribuição. */
  get showAside(): boolean {
    return !!this.realBalance || this.showDistribution;
  }

  get periodLabel(): string {
    if (this.period === 'year') return 'no ano';
    if (this.period === 'quarter') return 'no trimestre';
    return 'no mês';
  }

  get showDistribution(): boolean {
    return this.canAdvanced && this.overview.distribution.length > 1;
  }

  get hasAccounts(): boolean {
    return this.accounts.length > 0;
  }

  get canTransfer(): boolean {
    return this.canManageAccounts && this.accounts.filter((a) => a.isActive).length >= 2;
  }

  get activeAccountsNote(): string {
    const primary = this.accounts.find((a) => a.id === this.defaultAccountId);
    if (primary) return `Principal: ${primary.name}`;
    return `${this.accounts.length} conta(s) cadastrada(s).`;
  }

  readonly periodOptions: SegmentOption[] = [
    { value: 'month', label: 'Mês' },
    { value: 'quarter', label: 'Trimestre' },
    { value: 'year', label: 'Ano' }
  ];

  readonly typeFilterOptions: { value: AccountType | 'all'; label: string }[] = [
    { value: 'all', label: 'Todos os tipos' },
    { value: 'Checking', label: 'Conta corrente' },
    { value: 'Savings', label: 'Poupança' },
    { value: 'DigitalWallet', label: 'Carteira digital' },
    { value: 'Cash', label: 'Dinheiro' },
    { value: 'Other', label: 'Outro' }
  ];

  readonly statusFilterOptions = [
    { value: 'all', label: 'Todos os status' },
    { value: 'active', label: 'Ativas' },
    { value: 'inactive', label: 'Inativas' }
  ];

  readonly balanceFilterOptions = [
    { value: 'all', label: 'Todos os saldos' },
    { value: 'positive', label: 'Positivo' },
    { value: 'negative', label: 'Negativo' }
  ];

  readonly sortOptions: { value: AccountSort; label: string }[] = [
    { value: 'primary', label: 'Principal primeiro' },
    { value: 'balance-desc', label: 'Maior saldo' },
    { value: 'balance-asc', label: 'Menor saldo' },
    { value: 'name', label: 'Nome' },
    { value: 'recent', label: 'Movimentação recente' }
  ];

  setPeriod(period: string): void {
    this.period = period as AccountPeriod;
    this.accountsStore.loadRealBalance(this.period);
    this.accountsStore.loadAccountsActivity(this.period);
  }

  setPrimary(account: AccountResponse): void {
    this.accountsStore.setDefaultAccount(account.id);
  }

  refreshBalances(): void {
    this.error = '';
    this.accountsStore.refresh();
    this.accountsStore.loadRealBalance(this.period);
    this.lastActivityKey = '';
    this.accountsStore.loadAccountsActivity(this.period);
  }

  focusCreate(): void {
    this.showManageWorkspace = true;
    this.startCreate();
    queueMicrotask(() => this.scrollTo('accounts-workspace'));
  }

  focusTransfer(): void {
    this.showManageWorkspace = true;
    queueMicrotask(() => this.scrollTo('accounts-transfer'));
  }

  private scrollTo(id: string): void {
    if (typeof document === 'undefined') return;
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ---- Contas / formulário (comportamento preservado) -----------------------

  get selectedAccount(): AccountResponse | undefined {
    return this.accounts.find((account) => account.id === this.selectedAccountId);
  }

  get totalBalance(): number {
    return this.overview.totalBalance;
  }

  get activeAccountsCount(): number {
    return this.overview.activeCount;
  }

  get selectedAccountLabel(): string {
    return this.selectedAccount?.name || 'Nenhuma conta selecionada';
  }

  get canManageAccounts(): boolean {
    return this.uiPermissions.canManageAccounts();
  }

  get canImportAccounts(): boolean {
    return this.uiPermissions.canImportAccounts();
  }

  loadAccounts(): void {
    this.error = '';
    this.accountsStore.load(true);
  }

  startCreate(): void {
    this.editingId = null;
    this.error = '';
    this.form = this.createEmptyForm();
  }

  startEdit(account: AccountResponse): void {
    this.error = '';
    this.editingId = account.id;
    this.showManageWorkspace = true;
    this.form = {
      name: account.name,
      type: account.type,
      initialBalance: account.initialBalance,
      isActive: account.isActive,
      currency: account.currency
    };
    queueMicrotask(() => this.scrollTo('accounts-workspace'));
  }

  save(): void {
    if (this.saving) return;

    const name = (this.form.name || '').trim();
    const initialBalance = Number(this.form.initialBalance);

    if (name.length < 2 || !this.form.type || !Number.isFinite(initialBalance)) {
      this.error = 'Revise os campos destacados antes de salvar.';
      return;
    }

    this.saving = true;
    this.error = '';

    const payload: AccountRequest = {
      name,
      type: this.form.type,
      initialBalance,
      isActive: !!this.form.isActive,
      currency: this.form.currency || 'BRL'
    };

    const done = () => {
      this.startCreate();
      this.saving = false;
    };

    if (this.editingId) {
      this.accountsStore.update(this.editingId, payload, done);
      return;
    }

    this.accountsStore.create(payload, done);
  }

  remove(account: AccountResponse): void {
    this.accountToRemove = account;
  }

  cancelRemove(): void {
    this.accountToRemove = null;
  }

  confirmRemove(): void {
    const account = this.accountToRemove;
    if (!account) return;
    this.accountToRemove = null;

    this.accountsStore.delete(account.id, () => {
      if (this.selectedAccountId === account.id) {
        this.selectedAccountId = null;
        this.transactions = [];
      }
    });
  }

  selectAccount(accountId: string): void {
    this.accountsStore.selectAccount(accountId);
    this.selectedAccountId = accountId;
    this.loadTransactions();
    queueMicrotask(() => this.scrollTo('accounts-statement'));
  }

  loadTransactions(page = 1): void {
    if (!this.selectedAccountId) {
      this.transactions = [];
      return;
    }

    this.accountsStore.loadTransactions(this.selectedAccountId, {
      fromUtc: this.fromInput ? new Date(this.fromInput).toISOString() : undefined,
      toUtc: this.toInput ? new Date(this.toInput).toISOString() : undefined,
      page,
      pageSize: this.transactionsPageSize
    });
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.transactionsTotalPages) return;
    this.loadTransactions(page);
  }

  onTransferChange(value: AccountTransferFormValue): void {
    this.transferForm = value;
  }

  transfer(): void {
    if (this.transferring) return;
    if (!this.transferForm.fromAccountId || !this.transferForm.toAccountId) {
      this.error = 'Selecione conta de origem e destino.';
      return;
    }
    if (this.transferForm.fromAccountId === this.transferForm.toAccountId) {
      this.error = 'Origem e destino precisam ser contas diferentes.';
      return;
    }

    const amount = Number(this.transferForm.amount || 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      this.error = 'Informe um valor de transferência válido.';
      return;
    }

    this.transferring = true;
    this.error = '';

    const payload: AccountTransferRequest = {
      fromAccountId: this.transferForm.fromAccountId,
      toAccountId: this.transferForm.toAccountId,
      amount,
      description: this.transferForm.description?.trim() || null,
      occurredAt: this.transferForm.occurredAtInput ? new Date(this.transferForm.occurredAtInput).toISOString() : null
    };

    this.accountsStore.transfer(payload, () => {
      this.transferForm = {
        ...this.transferForm,
        amount: null,
        description: '',
        occurredAtInput: ''
      };
      this.transferring = false;
    });
  }

  onOfxSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (!this.selectedAccountId) {
      this.error = 'Selecione uma conta antes de importar OFX.';
      input.value = '';
      return;
    }

    const fileName = file.name.toLowerCase();
    const supportedType = file.type === 'application/x-ofx' || file.type === 'application/octet-stream' || file.type === 'text/plain';
    if (!fileName.endsWith('.ofx') && !supportedType) {
      this.error = 'Formato não suportado. Use um arquivo .ofx.';
      input.value = '';
      return;
    }

    this.error = '';
    this.ofxFileName = file.name;
    this.extractingOfx = true;
    this.ofxRawText = '';
    this.ofxExtract = { items: [], rawText: '' };

    this.accountsStore.extractOfx(file, this.selectedAccountId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (result) => {
        this.ofxExtract = {
          ...result,
          items: (result.items || []).map((item) => ({
            ...item,
            categoryId: item.categoryId ?? item.suggestedCategory?.categoryId ?? null
          }))
        };
        this.ofxRawText = result.rawText || '';
      },
      error: (err) => {
        this.error = extractApiErrorMessage(err, 'Falha ao processar arquivo OFX.');
        this.clearOfxState();
      },
      complete: () => {
        this.extractingOfx = false;
        input.value = '';
      }
    });
  }

  importOfx(): void {
    if (this.importingOfx || !this.selectedAccountId || !this.ofxExtract.items.length) return;

    this.importingOfx = true;
    this.error = '';
    this.accountsStore.importOfx({
      accountId: this.selectedAccountId,
      skipDuplicates: this.ofxSkipDuplicates,
      items: this.ofxExtract.items.map((item) => ({
        postedAt: item.postedAt,
        amount: item.amount,
        kind: item.kind,
        description: item.description,
        memo: item.memo ?? null,
        externalId: item.externalId ?? null,
        type: item.type ?? null,
        categoryId: item.categoryId ?? item.suggestedCategory?.categoryId ?? null
      }))
    }, () => {
      this.clearOfxState();
      this.importingOfx = false;
    });
  }

  clearOfxState(): void {
    this.ofxFileName = '';
    this.ofxRawText = '';
    this.ofxExtract = { items: [], rawText: '' };
  }

  onCsvSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (!this.selectedAccountId) {
      this.error = 'Selecione uma conta antes de importar CSV.';
      input.value = '';
      return;
    }

    const fileName = file.name.toLowerCase();
    const supportedType = file.type === 'text/csv' || file.type === 'application/vnd.ms-excel' || file.type === 'text/plain';
    if (!fileName.endsWith('.csv') && !supportedType) {
      this.error = 'Formato não suportado. Use um arquivo .csv.';
      input.value = '';
      return;
    }

    this.error = '';
    this.csvFileName = file.name;
    this.extractingCsv = true;
    this.csvRawText = '';
    this.csvExtract = { delimiter: ';', detectedColumns: [], items: [], rawText: '' };

    this.accountsStore.extractCsv(file, this.selectedAccountId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (result) => {
        this.csvExtract = {
          ...result,
          items: (result.items || []).map((item) => ({
            ...item,
            categoryId: item.categoryId ?? item.suggestedCategory?.categoryId ?? null
          }))
        };
        this.csvRawText = result.rawText || '';
      },
      error: (err) => {
        this.error = extractApiErrorMessage(err, 'Falha ao processar arquivo CSV.');
        this.clearCsvState();
      },
      complete: () => {
        this.extractingCsv = false;
        input.value = '';
      }
    });
  }

  importCsv(): void {
    if (this.importingCsv || !this.selectedAccountId || !this.csvExtract.items.length) return;

    this.importingCsv = true;
    this.error = '';
    this.accountsStore.importCsv({
      accountId: this.selectedAccountId,
      skipDuplicates: this.csvSkipDuplicates,
      items: this.csvExtract.items.map((item) => ({
        postedAt: item.postedAt,
        amount: item.amount,
        kind: item.kind,
        description: item.description,
        memo: item.memo ?? null,
        externalId: item.externalId ?? null,
        type: item.type ?? null,
        categoryId: item.categoryId ?? item.suggestedCategory?.categoryId ?? null
      }))
    }, () => {
      this.clearCsvState();
      this.importingCsv = false;
    });
  }

  clearCsvState(): void {
    this.csvFileName = '';
    this.csvRawText = '';
    this.csvExtract = { delimiter: ';', detectedColumns: [], items: [], rawText: '' };
  }

  sourceTypeLabel(sourceType?: string | null, sourceLabel?: string | null): string {
    if (sourceLabel?.trim()) return sourceLabel.trim();
    const raw = (sourceType || '').trim();
    return raw || '-';
  }

  duplicateCount(): number {
    return this.ofxExtract.items.filter((item) => item.isDuplicate).length;
  }

  onImportCategoryChanged(_event: unknown): void {
  }

  private createEmptyForm(): AccountRequest {
    return {
      name: '',
      type: 'Checking',
      initialBalance: 0,
      isActive: true,
      currency: 'BRL'
    };
  }

  private createEmptyTransferForm(): AccountTransferFormValue {
    return {
      fromAccountId: null,
      toAccountId: null,
      amount: null,
      occurredAtInput: '',
      description: ''
    };
  }

  private syncTransferDefaults(): void {
    const active = this.accounts.filter((account) => account.isActive);
    if (active.length < 2) {
      this.transferForm = {
        ...this.transferForm,
        fromAccountId: active[0]?.id ?? null,
        toAccountId: null
      };
      return;
    }

    let fromAccountId = this.transferForm.fromAccountId;
    let toAccountId = this.transferForm.toAccountId;

    if (!fromAccountId || !active.some((account) => account.id === fromAccountId)) {
      fromAccountId = active[0].id;
    }

    if (!toAccountId || !active.some((account) => account.id === toAccountId) || toAccountId === fromAccountId) {
      toAccountId = active.find((account) => account.id !== fromAccountId)?.id ?? null;
    }

    this.transferForm = {
      ...this.transferForm,
      fromAccountId,
      toAccountId
    };
  }

  private loadCategories(): void {
    this.categoriesService.list(undefined, { pageSize: 200 }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (items) => {
        this.categories = items || [];
      }
    });
  }
}
