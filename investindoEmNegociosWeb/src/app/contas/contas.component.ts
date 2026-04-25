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
  OfxExtractResponse,
  OfxTransactionPreview
} from '../accounts.service';
import { CategoriesService, CategoryDto, CategoryType } from '../categories.service';
import { AccountsStore } from '../accounts.store';
import { FormFieldComponent } from '../shared/form-field/form-field.component';

@Component({
  selector: 'app-contas',
  standalone: true,
  imports: [CommonModule, FormsModule, FormFieldComponent],
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
  loadingTransactions = false;

  fromInput = '';
  toInput = '';
  transferFromAccountId: string | null = null;
  transferToAccountId: string | null = null;
  transferAmount: number | null = null;
  transferDescription = '';
  transferOccurredAtInput = '';
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
    private readonly categoriesService: CategoriesService
  ) {
    effect(() => {
      this.accounts = this.accountsStore.accounts();
      this.loading = this.accountsStore.loading();
      this.error = this.accountsStore.error() || this.error;
      this.selectedAccountId = this.accountsStore.selectedAccountId();
      this.syncTransferDefaults();
    });

    effect(() => {
      this.transactions = this.accountsStore.transactions();
      this.loadingTransactions = this.accountsStore.transactionsLoading();
      this.error = this.accountsStore.transactionsError() || this.error;
    });
  }

  ngOnInit(): void {
    this.loadAccounts();
    this.loadCategories();
  }

  get selectedAccount(): AccountResponse | undefined {
    return this.accounts.find((a) => a.id === this.selectedAccountId);
  }

  get hasAccounts(): boolean {
    return this.accounts.length > 0;
  }

  loadAccounts(): void {
    this.error = '';
    this.accountsStore.load(true);
  }

  startCreate(): void {
    this.editingId = null;
    this.form = this.createEmptyForm();
  }

  startEdit(account: AccountResponse): void {
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
    this.saving = true;
    this.error = '';

    const payload: AccountRequest = {
      name: (this.form.name || '').trim(),
      type: this.form.type,
      initialBalance: Number(this.form.initialBalance || 0),
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
    this.loadTransactions();
  }

  loadTransactions(): void {
    if (!this.selectedAccountId) {
      this.transactions = [];
      return;
    }

    this.accountsStore.loadTransactions(this.selectedAccountId, {
      fromUtc: this.fromInput ? new Date(this.fromInput).toISOString() : undefined,
      toUtc: this.toInput ? new Date(this.toInput).toISOString() : undefined
    });
  }

  transfer(): void {
    if (this.transferring) return;
    if (!this.transferFromAccountId || !this.transferToAccountId) {
      this.error = 'Selecione conta de origem e destino.';
      return;
    }
    if (this.transferFromAccountId === this.transferToAccountId) {
      this.error = 'Origem e destino precisam ser contas diferentes.';
      return;
    }
    const amount = Number(this.transferAmount || 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      this.error = 'Informe um valor de transferência válido.';
      return;
    }

    this.transferring = true;
    this.error = '';
    const payload: AccountTransferRequest = {
      fromAccountId: this.transferFromAccountId,
      toAccountId: this.transferToAccountId,
      amount,
      description: this.transferDescription?.trim() || null,
      occurredAt: this.transferOccurredAtInput ? new Date(this.transferOccurredAtInput).toISOString() : null
    };

    this.accountsStore.transfer(payload, () => {
      this.transferAmount = null;
      this.transferDescription = '';
      this.transferOccurredAtInput = '';
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
        this.error = err?.error?.detail || 'Falha ao processar arquivo OFX.';
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
        this.error = err?.error?.detail || 'Falha ao processar arquivo CSV.';
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

  accountTypeLabel(type: AccountType): string {
    switch (type) {
      case 'Checking': return 'Conta corrente';
      case 'Savings': return 'Poupança';
      case 'DigitalWallet': return 'Carteira digital';
      case 'Cash': return 'Dinheiro';
      default: return 'Outro';
    }
  }

  canTransfer(): boolean {
    return this.accounts.filter((a) => a.isActive).length >= 2;
  }

  sourceTypeLabel(sourceType?: string | null, sourceLabel?: string | null): string {
    if (sourceLabel?.trim()) return sourceLabel.trim();
    const raw = (sourceType || '').trim();
    return raw || '-';
  }

  duplicateCount(): number {
    return this.ofxExtract.items.filter((item) => item.isDuplicate).length;
  }

  importableCount(): number {
    if (!this.ofxSkipDuplicates) return this.ofxExtract.items.length;
    return this.ofxExtract.items.filter((item) => !item.isDuplicate).length;
  }

  trackOfxItem(index: number, item: OfxTransactionPreview): string {
    return `${item.externalId || item.description}-${item.postedAt}-${index}`;
  }

  categoriesForItem(kind: 'Credit' | 'Debit'): CategoryDto[] {
    const type: CategoryType = kind === 'Credit' ? 'Income' : 'Expense';
    return this.categories.filter((category) => category.appliesTo === type || category.appliesTo === null);
  }

  confidenceLabel(score?: number | null, band?: string | null, value?: number | null): string {
    const resolvedScore = score ?? (value == null ? null : Math.round(value * 100));
    const resolvedBand = band || (resolvedScore == null
      ? null
      : resolvedScore >= 95
        ? 'high'
        : resolvedScore >= 85
          ? 'medium'
          : 'low');
    if (resolvedScore == null) return '';
    if (resolvedBand === 'high') return `Alta (${resolvedScore}/100)`;
    if (resolvedBand === 'medium') return `Boa (${resolvedScore}/100)`;
    return `Inicial (${resolvedScore}/100)`;
  }

  recurrenceLabel(frequency?: string | null): string {
    if (!frequency) return 'Recorrente';
    if (frequency === 'Monthly') return 'Recorrente mensal';
    return `Recorrente ${frequency.toLowerCase()}`;
  }

  recurrenceScoreLabel(score?: number | null, band?: string | null): string {
    if (score == null) return '';
    if (band === 'high') return `Alta (${score}/100)`;
    if (band === 'medium') return `Boa (${score}/100)`;
    return `Inicial (${score}/100)`;
  }

  csvDuplicateCount(): number {
    return this.csvExtract.items.filter((item) => item.isDuplicate).length;
  }

  csvImportableCount(): number {
    if (!this.csvSkipDuplicates) return this.csvExtract.items.length;
    return this.csvExtract.items.filter((item) => !item.isDuplicate).length;
  }

  private createEmptyForm(): AccountRequest {
    return {
      name: '',
      type: 'Checking',
      initialBalance: 0,
      isActive: true
    };
  }

  private syncTransferDefaults(): void {
    const active = this.accounts.filter((a) => a.isActive);
    if (active.length < 2) {
      this.transferFromAccountId = active[0]?.id ?? null;
      this.transferToAccountId = null;
      return;
    }

    if (!this.transferFromAccountId || !active.some((a) => a.id === this.transferFromAccountId)) {
      this.transferFromAccountId = active[0].id;
    }
    if (!this.transferToAccountId || !active.some((a) => a.id === this.transferToAccountId) || this.transferToAccountId === this.transferFromAccountId) {
      this.transferToAccountId = active.find((a) => a.id !== this.transferFromAccountId)?.id ?? null;
    }
  }

  private loadCategories(): void {
    this.categoriesService.list(undefined, { pageSize: 200 }).subscribe({
      next: (items) => {
        this.categories = items || [];
      }
    });
  }
}
