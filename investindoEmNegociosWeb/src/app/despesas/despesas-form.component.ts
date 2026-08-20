import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PaymentMethodLookup } from '../lookups.service';
import { SelectMenuComponent, SelectMenuOption } from '../shared/select-menu/select-menu.component';
import { NumberStepperComponent } from '../shared/number-stepper/number-stepper.component';
import { colorForCategory } from '../categories/categories-overview.model';

import { StoredCard, StoredExpense } from '../data/api-data.service';
import { DigitOnlyDirective } from '../utils/digit-only.directive';
import { RouterLink } from '@angular/router';
import { CategoryDto } from '../categories.service';
import { ModalComponent } from '../shared/modal/modal.component';
import { FormFieldComponent } from '../shared/form-field/form-field.component';
import { ToggleFieldComponent } from '../shared/toggle-field/toggle-field.component';
import { DatePickerComponent } from '../shared/date-picker/date-picker.component';

@Component({
  selector: 'app-despesas-form',
  standalone: true,
  imports: [FormsModule, DigitOnlyDirective, RouterLink, ModalComponent, FormFieldComponent, ToggleFieldComponent, DatePickerComponent, SelectMenuComponent, NumberStepperComponent],
  templateUrl: './despesas-form.component.html',
  styleUrls: ['./despesas-form.component.scss']
})
export class DespesasFormComponent {
  private readonly brandFallbackMap: Record<string, string> = {
    '1': 'VISA',
    '2': 'MASTERCARD',
    '3': 'ELO',
    '4': 'AMEX',
    '5': 'HIPERCARD'
  };
  @Input() mostrarForm = false;
  @Input() categorias: CategoryDto[] = [];
  @Input() cartoes: StoredCard[] = [];
  @Input() novaDespesa!: StoredExpense;
  @Input() valorInput = '';
  @Input() valorParcelaLabel = '';
  @Input() vencimentoInput = '';
  @Input() erroData = '';
  @Input() erroCategoria = '';
  @Input() formaPagamento: 'avista' | 'cartao' = 'avista';
  @Input() parcelar = false;
  @Input() parcelasCount = 1;
  @Input() fixa = false;
  @Input() fixaMeses: number | null = null;
  @Input() saving = false;
  @Input() cartaoSelecionadoId: string | null = null;
  @Input() cartaoSelecionadoLabel = '';
  @Input() cardBrandMap: Record<string, string> = {};
  @Input() allowCardPayment = true;
  @Input() paymentMethods: PaymentMethodLookup[] = [];
  @Input() formaPagamentoId: number | null = null;
  @Input() isEdit = false;

  @Output() valorChange = new EventEmitter<string>();
  @Output() vencimentoChange = new EventEmitter<string>();
  @Output() formaPagamentoChange = new EventEmitter<'avista' | 'cartao'>();
  @Output() formaPagamentoIdChange = new EventEmitter<number | null>();
  @Output() parcelarChange = new EventEmitter<boolean>();
  @Output() parcelasChange = new EventEmitter<number>();
  @Output() cartaoChange = new EventEmitter<string | null>();
  @Output() fixaChange = new EventEmitter<boolean>();
  @Output() fixaMesesChange = new EventEmitter<number | null>();
  @Output() categoriasRequested = new EventEmitter<void>();

  /** Opções de categoria com o ponto colorido, como no design. */
  get categoriaOptions(): SelectMenuOption[] {
    return (this.categorias || []).map((c) => ({
      value: c.id,
      label: c.name,
      color: colorForCategory(c.id || c.name)
    }));
  }

  /* "Parcelar ou repetir" é um controle só: no crédito ele liga o parcelamento,
     fora dele liga a repetição mensal. Quem guarda o estado continua sendo a
     tela — aqui só traduzimos para o que a forma de pagamento permite. */
  get repetir(): boolean {
    return this.formaPagamento === 'cartao' ? this.parcelar : this.fixa;
  }

  onRepetirToggle(ligado: boolean): void {
    if (this.formaPagamento === 'cartao') {
      this.parcelar = ligado;
      this.parcelarChange.emit(ligado);
      if (ligado && this.parcelasCount < 2) this.onParcelasChange(2);
      return;
    }
    this.fixa = ligado;
    this.fixaChange.emit(ligado);
  }

  /** Só o crédito abre cartão e parcelas; o resto é pagamento direto. */
  get metodosDisponiveis(): PaymentMethodLookup[] {
    return this.paymentMethods.filter((m) => this.allowCardPayment || !this.ehCredito(m));
  }

  /**
   * Opções da forma de pagamento e do cartão para o `app-select-menu`.
   *
   * O primitivo trabalha com `string`; o id do método é numérico, então a
   * conversão acontece aqui e na volta, em `onFormaPagamentoValue`.
   */
  get formaPagamentoOptions(): SelectMenuOption[] {
    return this.metodosDisponiveis.map((metodo) => ({ value: String(metodo.id), label: metodo.name }));
  }

  get formaPagamentoValue(): string {
    return this.formaPagamentoId === null || this.formaPagamentoId === undefined
      ? ''
      : String(this.formaPagamentoId);
  }

  get cartaoOptions(): SelectMenuOption[] {
    return this.cartoes
      .filter((cartao) => !!cartao.id)
      .map((cartao) => ({ value: cartao.id!, label: this.cartaoLabel(cartao) }));
  }

  onFormaPagamentoValue(value: string): void {
    this.onMetodoPagamentoChange(value ? Number(value) : null);
  }

  onMetodoPagamentoChange(id: number | null): void {
    this.formaPagamentoId = id;
    this.formaPagamentoIdChange.emit(id);

    const metodo = this.paymentMethods.find((m) => m.id === id);
    const modo = metodo && this.ehCredito(metodo) ? 'cartao' : 'avista';
    if (modo !== this.formaPagamento) {
      this.formaPagamento = modo;
      this.formaPagamentoChange.emit(modo);
    }
  }

  private ehCredito(metodo: PaymentMethodLookup): boolean {
    return (metodo.name || '').toLowerCase().includes('crédito');
  }

  onCategoriaChange(valor: string): void {
    this.novaDespesa.categoryId = valor || null;
  }

  irParaCategorias(): void {
    this.categoriasRequested.emit();
  }

  @Output() submitForm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  get semCartaoNoCredito(): boolean {
    return this.formaPagamento === 'cartao' && (!this.allowCardPayment || !this.cartoes.length);
  }

  private resolveBrandName(brandIdOrName?: string): string {
    const raw = (brandIdOrName || '').toString().trim();
    if (!raw) return 'Cartão';
    return (
      this.cardBrandMap[raw] ||
      this.cardBrandMap[raw.toUpperCase()] ||
      this.brandFallbackMap[raw] ||
      raw.toUpperCase()
    );
  }

  private maskedCardNumber(numero?: string): string {
    if (!numero) return '**** *********** ****';
    const digits = numero.replace(/\D/g, '');
    const last4 = digits.slice(-4).padStart(4, '*');
    if (digits.length >= 8) {
      const first4 = digits.slice(0, 4);
      return `${first4} *********** ${last4}`;
    }
    return `**** *********** ${last4}`;
  }

  cartaoLabel(cartao: StoredCard): string {
    const bandeira = this.resolveBrandName(cartao?.bandeira);
    return `Cartão - ${bandeira} - ${this.maskedCardNumber(cartao?.numero)}`;
  }

  onValorChange(value: string): void {
    this.valorChange.emit(value);
  }

  onVencimentoChange(value: string): void {
    this.vencimentoChange.emit(value);
  }

  onFormaPagamentoChange(value: 'avista' | 'cartao'): void {
    if (value === 'cartao' && !this.allowCardPayment) {
      this.formaPagamentoChange.emit('avista');
      return;
    }
    this.formaPagamentoChange.emit(value);
  }

  onParcelarToggle(value: boolean): void {
    this.parcelarChange.emit(value);
  }

  onParcelasChange(value: number): void {
    this.parcelasChange.emit(value);
  }

  onCartaoChange(value: string | null): void {
    this.cartaoChange.emit(value);
  }

  salvar(): void {
    if (this.semCartaoNoCredito) return;
    this.submitForm.emit();
  }

  fechar(): void {
    this.cancel.emit();
  }
  trackByIndex(index: number, _item?: unknown): number {
    return index;
  }

}
