import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  AccountRequest,
  AccountResponse,
  AccountTransferRequest,
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
  transferFromAccountId: string | null = null;
  transferToAccountId: string | null = null;
  transferAmount: number | null = null;
  transferDescription = '';
  transferOccurredAtInput = '';
  transferring = false;

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
        this.syncTransferDefaults();
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

    this.accountsService.transfer(payload).subscribe({
      next: () => {
        this.transferAmount = null;
        this.transferDescription = '';
        this.transferOccurredAtInput = '';
        this.loadAccounts();
        if (this.selectedAccountId === this.transferFromAccountId || this.selectedAccountId === this.transferToAccountId) {
          this.loadTransactions();
        }
      },
      error: (err) => {
        this.error = err?.error?.detail || 'Falha ao transferir entre contas.';
      },
      complete: () => {
        this.transferring = false;
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

  canTransfer(): boolean {
    return this.accounts.filter((a) => a.isActive).length >= 2;
  }

  sourceTypeLabel(sourceType?: string | null): string {
    const raw = (sourceType || '').trim();
    if (!raw) return '-';
    if (raw === 'InstallmentPayment') return 'Receita/Despesa';
    if (raw === 'InstallmentPaymentReversal') return 'Estorno';
    if (raw === 'AccountTransfer') return 'Transferência';
    return raw;
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
}
