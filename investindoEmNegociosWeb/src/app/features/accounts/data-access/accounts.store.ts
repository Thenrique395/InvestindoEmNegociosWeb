import { Injectable, signal, computed } from '@angular/core';
import { finalize } from 'rxjs';
import { AccountsService } from './accounts.service';
import {
  AccountRequest,
  AccountResponse,
  AccountTransactionResponse
} from '../models/account.models';

@Injectable({ providedIn: 'root' })
export class AccountsStore {
  private accountsState = signal<AccountResponse[]>([]);
  private loadingState = signal(false);
  private errorState = signal<string | null>(null);

  readonly accounts = computed(() => this.accountsState());
  readonly loading = computed(() => this.loadingState());
  readonly error = computed(() => this.errorState());

  constructor(private service: AccountsService) {}

  load(): void {
    this.loadingState.set(true);
    this.service.list()
      .pipe(finalize(() => this.loadingState.set(false)))
      .subscribe({
        next: (data) => this.accountsState.set(data || []),
        error: () => this.errorState.set('Erro ao carregar contas')
      });
  }

  create(payload: AccountRequest): void {
    this.service.create(payload).subscribe(() => this.load());
  }

  update(id: string, payload: AccountRequest): void {
    this.service.update(id, payload).subscribe(() => this.load());
  }

  delete(id: string): void {
    this.service.delete(id).subscribe(() => this.load());
  }
}
