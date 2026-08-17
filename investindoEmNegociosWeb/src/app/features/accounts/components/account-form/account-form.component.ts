import { Component, EventEmitter, Input, Output } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { FormFieldComponent } from '../../../../shared/form-field/form-field.component';
import { SelectMenuComponent, SelectMenuOption } from '../../../../shared/select-menu/select-menu.component';
import { AccountRequest, AccountType } from '../../models/account.models';
import { SUPPORTED_CURRENCIES } from '../../../../utils/locale-settings';

type AccountFormField = 'name' | 'type' | 'initialBalance';

@Component({
  selector: 'app-account-form',
  standalone: true,
  imports: [FormsModule, FormFieldComponent, SelectMenuComponent],
  templateUrl: './account-form.component.html',
  styleUrl: './account-form.component.scss'
})
export class AccountFormComponent {
  @Input({ required: true }) form!: AccountRequest;
  @Input() editingId: string | null = null;
  @Input() saving = false;
  @Input() accountTypes: AccountType[] = [];
  @Input() currencies: readonly string[] = SUPPORTED_CURRENCIES;

  @Output() save = new EventEmitter<void>();
  @Output() clear = new EventEmitter<void>();

  submitted = false;
  touched: Record<AccountFormField, boolean> = {
    name: false,
    type: false,
    initialBalance: false
  };

  get nameError(): string {
    if (!this.shouldShowError('name')) return '';
    const name = (this.form.name || '').trim();
    if (!name) return 'Informe o nome da conta.';
    if (name.length < 2) return 'O nome precisa ter pelo menos 2 caracteres.';
    return '';
  }

  get accountTypeOptions(): SelectMenuOption[] {
    return this.accountTypes.map((type) => ({ value: type, label: type }));
  }

  get currencyOptions(): SelectMenuOption[] {
    return this.currencies.map((currency) => ({ value: currency, label: currency }));
  }

  get typeError(): string {
    if (!this.shouldShowError('type')) return '';
    return this.form.type ? '' : 'Selecione o tipo da conta.';
  }

  get balanceError(): string {
    if (!this.shouldShowError('initialBalance')) return '';
    const balance = Number(this.form.initialBalance);
    return Number.isFinite(balance) ? '' : 'Informe um saldo inicial válido.';
  }

  get isValid(): boolean {
    const name = (this.form.name || '').trim();
    const balance = Number(this.form.initialBalance);
    return name.length >= 2 && !!this.form.type && Number.isFinite(balance);
  }

  onSave(): void {
    this.submitted = true;
    this.touched = { name: true, type: true, initialBalance: true };

    if (!this.isValid) return;
    this.save.emit();
  }

  onClear(): void {
    this.resetValidationState();
    this.clear.emit();
  }

  onTouch(field: AccountFormField): void {
    this.touched[field] = true;
  }

  private shouldShowError(field: AccountFormField): boolean {
    return this.submitted || this.touched[field];
  }

  private resetValidationState(): void {
    this.submitted = false;
    this.touched = { name: false, type: false, initialBalance: false };
  }
}
