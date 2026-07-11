import { Component, EventEmitter, Input, Output } from '@angular/core';

import { AccountResponse, AccountType } from '../../models/account.models';
import { EmptyStateComponent } from '../../../../empty-state/empty-state.component';
import { UiStateComponent } from '../../../../ui-state/ui-state.component';
import { AccountCardComponent } from '../account-card/account-card.component';
import { AccountActivity, accountTypeLabel } from '../../../../contas/accounts-overview.model';

@Component({
  selector: 'app-account-list',
  standalone: true,
  imports: [EmptyStateComponent, UiStateComponent, AccountCardComponent],
  templateUrl: './account-list.component.html',
  styleUrl: './account-list.component.scss'
})
export class AccountListComponent {
  @Input() accounts: AccountResponse[] = [];
  @Input() loading = false;
  @Input() canManage = true;

  /** Novos (opcionais) — retrocompatíveis com usos existentes (ex.: styleguide). */
  @Input() showHeader = true;
  @Input() activityMap: Record<string, AccountActivity> = {};
  @Input() primaryAccountId: string | null = null;
  @Input() canTransfer = false;
  @Input() canSetPrimary = false;

  @Output() refresh = new EventEmitter<void>();
  @Output() create = new EventEmitter<void>();
  @Output() selectAccount = new EventEmitter<string>();
  @Output() edit = new EventEmitter<AccountResponse>();
  @Output() remove = new EventEmitter<AccountResponse>();
  @Output() transfer = new EventEmitter<AccountResponse>();
  @Output() setPrimary = new EventEmitter<AccountResponse>();

  get hasAccounts(): boolean {
    return this.accounts.length > 0;
  }

  accountTypeLabel(type: AccountType): string {
    return accountTypeLabel(type);
  }

  activityFor(accountId: string): AccountActivity | null {
    return this.activityMap[accountId] ?? null;
  }

  trackByAccountId(_: number, account: AccountResponse): string {
    return account.id;
  }
}
