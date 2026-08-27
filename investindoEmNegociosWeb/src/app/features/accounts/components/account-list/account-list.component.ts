import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { AccountResponse, AccountType } from '../../models/account.models';
import { EmptyStateComponent } from '../../../../empty-state/empty-state.component';
import { UiStateComponent } from '../../../../ui-state/ui-state.component';
import { AccountCardComponent } from '../account-card/account-card.component';
import { AccountActivity, accountTypeLabel } from '../../../../contas/accounts-overview.model';

@Component({
  selector: 'app-account-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EmptyStateComponent, UiStateComponent, AccountCardComponent],
  templateUrl: './account-list.component.html',
  styleUrl: './account-list.component.scss'
})
export class AccountListComponent {
  readonly accounts = input<AccountResponse[]>([]);
  readonly loading = input(false);
  readonly canManage = input(true);

  /** Novos (opcionais) — retrocompatíveis com usos existentes (ex.: styleguide). */
  readonly showHeader = input(true);
  readonly activityMap = input<Record<string, AccountActivity>>({});
  readonly primaryAccountId = input<string | null>(null);
  readonly canTransfer = input(false);
  readonly canSetPrimary = input(false);

  readonly refresh = output<void>();
  readonly create = output<void>();
  readonly selectAccount = output<string>();
  readonly edit = output<AccountResponse>();
  readonly remove = output<AccountResponse>();
  readonly transfer = output<AccountResponse>();
  readonly setPrimary = output<AccountResponse>();

  readonly hasAccounts = computed(() => this.accounts().length > 0);

  accountTypeLabel(type: AccountType): string {
    return accountTypeLabel(type);
  }

  activityFor(accountId: string): AccountActivity | null {
    return this.activityMap()[accountId] ?? null;
  }

  trackByAccountId(_: number, account: AccountResponse): string {
    return account.id;
  }
}
