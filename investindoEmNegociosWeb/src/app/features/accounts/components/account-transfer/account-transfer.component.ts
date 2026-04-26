import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
  imports: [CommonModule, FormsModule],
  templateUrl: './account-transfer.component.html'
})
export class AccountTransferComponent {
  @Input() accounts: AccountResponse[] = [];
  @Input() value: AccountTransferFormValue = {
    fromAccountId: null,
    toAccountId: null,
    amount: null,
    occurredAtInput: '',
    description: ''
  };
  @Input() transferring = false;

  @Output() valueChange = new EventEmitter<AccountTransferFormValue>();
  @Output() submitTransfer = new EventEmitter<void>();

  get canTransfer(): boolean {
    return this.accounts.filter((account) => account.isActive).length >= 2;
  }

  update<K extends keyof AccountTransferFormValue>(key: K, nextValue: AccountTransferFormValue[K]): void {
    this.value = { ...this.value, [key]: nextValue };
    this.valueChange.emit(this.value);
  }
}
