import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  AccountRequest,
  AccountResponse,
  AccountTransactionResponse,
  AccountType,
  AccountsService
} from '../accounts.service';

@Component({
  selector: 'app-contas',
  standalone: true,
  imports: [CommonModule, FormsModule],
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

  editingId: string | null = null;
  form: AccountRequest = this.createEmptyForm();

  readonly accountTypes: AccountType[] = ['Checking', 'Savings', 'DigitalWallet', 'Cash', 'Other'];

  constructor(private readonly accountsService: AccountsService) {}

  ngOnInit(): void {
    this.loadAccounts();
  }

  get selectedAccount(): AccountResponse | undefined {
    return this.accounts.find((a) => a.id === this.selectedAccountId);
  }

  get hasAccounts(): boolean {
    return this.accounts.length > 0;
  }

  loadAccounts(): void {
    this.loading = true;
    this.error = '';
    this.accountsService.list().subscribe({
      next: (items) => {
        this.accounts = items || [];
        if (this.selectedAccountId && !this.accounts.some((a) => a.id === this.selectedAccountId)) {
          this.selectedAccountId = null;
          this.transactions = [];
        }
      },
      error: () => {
        this.error = 'Falha ao carregar contas.';
      },
      complete: () => {
        this.loading = false;
      }
    });
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
    this.saving = true;
    this.error = '';

    const payload: AccountRequest = {
      name: (this.form.name || '').trim(),
      type: this.form.type,
      initialBalance: Number(this.form.initialBalance || 0),
      isActive: !!this.form.isActive
    };

    const request$ = this.editingId
      ? this.accountsService.update(this.editingId, payload)
      : this.accountsService.create(payload);

    request$.subscribe({
      next: () => {
        this.startCreate();
        this.loadAccounts();
      },
      error: (err) => {
        this.error = err?.error?.detail || 'Falha ao salvar conta.';
      },
      complete: () => {
        this.saving = false;
      }
    });
  }

  remove(account: AccountResponse): void {
    if (!confirm(`Remover a conta "${account.name}"?`)) return;

    this.accountsService.delete(account.id).subscribe({
      next: () => {
        if (this.selectedAccountId === account.id) {
          this.selectedAccountId = null;
          this.transactions = [];
        }
        this.loadAccounts();
      },
      error: () => {
        this.error = 'Falha ao remover conta.';
      }
    });
  }

  selectAccount(accountId: string): void {
    this.selectedAccountId = accountId;
    this.loadTransactions();
  }

  loadTransactions(): void {
    if (!this.selectedAccountId) {
      this.transactions = [];
      return;
    }

    this.loadingTransactions = true;
    this.accountsService
      .listTransactions(this.selectedAccountId, {
        fromUtc: this.fromInput ? new Date(this.fromInput).toISOString() : undefined,
        toUtc: this.toInput ? new Date(this.toInput).toISOString() : undefined
      })
      .subscribe({
        next: (items) => {
          this.transactions = items || [];
        },
        error: () => {
          this.error = 'Falha ao carregar extrato da conta.';
        },
        complete: () => {
          this.loadingTransactions = false;
        }
      });
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

  private createEmptyForm(): AccountRequest {
    return {
      name: '',
      type: 'Checking',
      initialBalance: 0,
      isActive: true
    };
  }
}
