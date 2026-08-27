import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { FormFieldComponent } from '../../../../shared/form-field/form-field.component';
import { SelectMenuComponent, SelectMenuOption } from '../../../../shared/select-menu/select-menu.component';
import { AccountRequest, AccountType } from '../../models/account.models';
import { SUPPORTED_CURRENCIES } from '../../../../utils/locale-settings';

type AccountFormField = 'name' | 'type' | 'initialBalance';

@Component({
  selector: 'app-account-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, FormFieldComponent, SelectMenuComponent],
  templateUrl: './account-form.component.html',
  styleUrl: './account-form.component.scss'
})
export class AccountFormComponent {
  /**
   * `form` é um objeto MUTÁVEL do pai: o template escreve nele por `[(ngModel)]`.
   * Fica como `input()` para manter exatamente esse contrato — trocar por um
   * fluxo imutável mudaria a tela de Contas junto, e é assunto da conversão
   * daquela tela, não deste primitivo.
   */
  readonly form = input.required<AccountRequest>();
  readonly editingId = input<string | null>(null);
  readonly saving = input(false);
  readonly accountTypes = input<AccountType[]>([]);
  readonly currencies = input<readonly string[]>(SUPPORTED_CURRENCIES);

  readonly save = output<void>();
  readonly clear = output<void>();

  /**
   * Estado de validação é local e mutável — vira signal para que o `OnPush`
   * enxergue a mudança. `touched` é substituído por inteiro (nunca mutado no
   * lugar), senão o signal não notifica.
   */
  private readonly submitted = signal(false);
  private readonly touched = signal<Record<AccountFormField, boolean>>({
    name: false,
    type: false,
    initialBalance: false
  });

  readonly accountTypeOptions = computed<SelectMenuOption[]>(() =>
    this.accountTypes().map((type) => ({ value: type, label: type }))
  );

  readonly currencyOptions = computed<SelectMenuOption[]>(() =>
    this.currencies().map((currency) => ({ value: currency, label: currency }))
  );

  /*
   * Os erros continuam como getter, de propósito: dependem das propriedades
   * MUTADAS de `form()`, que não são reativas — um `computed` memoizaria em
   * cima de uma dependência que nunca notifica e a mensagem congelaria. Como
   * a mutação vem do `ngModel` deste mesmo componente, o evento já marca o
   * `OnPush` como sujo e o getter reavalia na hora certa.
   */
  get nameError(): string {
    if (!this.shouldShowError('name')) return '';
    const name = (this.form().name || '').trim();
    if (!name) return 'Informe o nome da conta.';
    if (name.length < 2) return 'O nome precisa ter pelo menos 2 caracteres.';
    return '';
  }

  get typeError(): string {
    if (!this.shouldShowError('type')) return '';
    return this.form().type ? '' : 'Selecione o tipo da conta.';
  }

  get balanceError(): string {
    if (!this.shouldShowError('initialBalance')) return '';
    const balance = Number(this.form().initialBalance);
    return Number.isFinite(balance) ? '' : 'Informe um saldo inicial válido.';
  }

  get isValid(): boolean {
    const name = (this.form().name || '').trim();
    const balance = Number(this.form().initialBalance);
    return name.length >= 2 && !!this.form().type && Number.isFinite(balance);
  }

  onSave(): void {
    this.submitted.set(true);
    this.touched.set({ name: true, type: true, initialBalance: true });

    if (!this.isValid) return;
    this.save.emit();
  }

  onClear(): void {
    this.resetValidationState();
    this.clear.emit();
  }

  onTouch(field: AccountFormField): void {
    this.touched.update((atual) => ({ ...atual, [field]: true }));
  }

  private shouldShowError(field: AccountFormField): boolean {
    return this.submitted() || this.touched()[field];
  }

  private resetValidationState(): void {
    this.submitted.set(false);
    this.touched.set({ name: false, type: false, initialBalance: false });
  }
}
