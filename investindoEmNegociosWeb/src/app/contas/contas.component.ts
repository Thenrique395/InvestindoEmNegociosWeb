import { Component, OnInit, effect } from '@angular/core';
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
import { AppCurrencyPipe } from '../shared/app-currency.pipe';
import { StatCardComponent } from '../shared/stat-card/stat-card.component';
import { PeriodHeroComponent } from '../shared/period-hero/period-hero.component';
import { PeriodActionCardComponent } from '../shared/period-action-card/period-action-card.component';
import { UiPermissionsService } from '../ui-permissions.service';

@Component({
  selector: 'app-contas',
  standalone: true,
  imports: [CommonModule, FormsModule, AccountFormComponent, AccountListComponent, AccountTransferComponent, AccountImportComponent, SectionCardComponent, EmptyStateComponent, UiStateComponent, AppCurrencyPipe, StatCardComponent, PeriodHeroComponent, PeriodActionCardComponent],
  templateUrl: './contas.component.html',
  styleUrls: ['./contas.component.scss']
})
export class ContasComponent implements OnInit {
  loading = false;
  saving = false;
  error = '';

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

  constructor(
    private readonly accountsStore: AccountsStore,
    private readonly categoriesService: CategoriesService,
    private readonly uiPermissions: UiPermissionsService
  ) {
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
  }

  ngOnInit(): void {
    this.loadAccounts();
    this.loadCategories();
  }

  get selectedAccount(): AccountResponse | undefined {
    return this.accounts.find((account) => account.id === this.selectedAccountId);
  }

  get totalBalance(): number {
    return this.accounts.reduce((total, account) => total + Number(account.currentBalance || 0), 0);
  }

  get activeAccountsCount(): number {
    return this.accounts.filter((account) => account.isActive).length;
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
    this.form = {
      name: account.name,
      type: account.type,
      initialBalance: account.initialBalance,
      isActive: account.isActive
    };
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
      isActive: !!this.form.isActive
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
    if (!confirm(`Remover a conta "${account.name}"?`)) return;

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

    this.accountsStore.extractOfx(file, this.selectedAccountId).subscribe({
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

    this.accountsStore.extractCsv(file, this.selectedAccountId).subscribe({
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
      isActive: true
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
    this.categoriesService.list(undefined, { pageSize: 200 }).subscribe({
      next: (items) => {
        this.categories = items || [];
      }
    });
  }
}
