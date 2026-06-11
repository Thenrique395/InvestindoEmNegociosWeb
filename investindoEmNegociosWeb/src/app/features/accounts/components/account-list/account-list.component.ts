import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AccountResponse, AccountType } from '../../models/account.models';
import { EmptyStateComponent } from '../../../../empty-state/empty-state.component';
import { UiStateComponent } from '../../../../ui-state/ui-state.component';
import { AppCurrencyPipe } from '../../../../shared/app-currency.pipe';

@Component({
  selector: 'app-account-list',
  standalone: true,
  imports: [CommonModule, EmptyStateComponent, UiStateComponent, AppCurrencyPipe],
  templateUrl: './account-list.component.html',
  styleUrl: './account-list.component.scss'
})
export class AccountListComponent {
  @Input() accounts: AccountResponse[] = [];
  @Input() loading = false;
  @Input() canManage = true;

  @Output() refresh = new EventEmitter<void>();
  @Output() create = new EventEmitter<void>();
  @Output() selectAccount = new EventEmitter<string>();
  @Output() edit = new EventEmitter<AccountResponse>();
  @Output() remove = new EventEmitter<AccountResponse>();

  get hasAccounts(): boolean {
    return this.accounts.length > 0;
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

  trackByAccountId(_: number, account: AccountResponse): string {
    return account.id;
  }
}
