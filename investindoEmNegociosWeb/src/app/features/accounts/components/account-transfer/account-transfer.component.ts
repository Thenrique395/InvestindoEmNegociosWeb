import { ChangeDetectionStrategy, Component, computed, input, model, output } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { SelectMenuComponent, SelectMenuOption } from '../../../../shared/select-menu/select-menu.component';
import { AccountResponse } from '../../models/account.models';

export interface AccountTransferFormValue {
  fromAccountId: string | null;
  toAccountId: string | null;
  amount: number | null;
  occurredAtInput: string;
  description: string;
}

@Component({
  selector: 'app-account-transfer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, SelectMenuComponent],
  templateUrl: './account-transfer.component.html'
})
export class AccountTransferComponent {
  readonly accounts = input<AccountResponse[]>([]);
  /**
   * Par `value`/`valueChange`: é two-way, então `model()` — que emite
   * `valueChange` no `.set()`. Antes era `@Input() value` reatribuído dentro do
   * componente, que é escrever em `@Input` (ARQUITETURA_ANGULAR.md §4).
   */
  readonly value = model<AccountTransferFormValue>({
    fromAccountId: null,
    toAccountId: null,
    amount: null,
    occurredAtInput: '',
    description: ''
  });
  readonly transferring = input(false);

  readonly submitTransfer = output<void>();

  readonly canTransfer = computed(
    () => this.accounts().filter((account) => account.isActive).length >= 2
  );

  readonly fromAccountOptions = computed<SelectMenuOption[]>(() =>
    this.accounts().map((account) => ({
      value: account.id,
      label: account.name,
      disabled: !account.isActive,
    }))
  );

  readonly toAccountOptions = computed<SelectMenuOption[]>(() =>
    this.accounts().map((account) => ({
      value: account.id,
      label: account.name,
      disabled: !account.isActive || account.id === this.value().fromAccountId,
    }))
  );

  update<K extends keyof AccountTransferFormValue>(key: K, nextValue: AccountTransferFormValue[K]): void {
    this.value.update((atual) => ({ ...atual, [key]: nextValue }));
  }
}
