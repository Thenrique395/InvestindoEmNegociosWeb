import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { StoredCard } from '../../../core/data/api-data.service';
import { CardBrandLookup, InstitutionLookup } from '../../../core/lookups.service';
import { LookupsStore } from '../../../core/lookups.store';
import { CardsStore } from '../../../core/cards.store';
import { CardDto, CardPayload } from '../../../core/cards.service';
import { UiFeedbackService } from '../../../core/ui-feedback.service';
import { DigitOnlyDirective } from '../../../core/utils/digit-only.directive';
import { maskMoneyInput } from '../../../core/utils/input-mask';
import { FormState } from '../../../core/utils/form-state';
import { ModalComponent } from '../../../shared/modal/modal.component';
import { FormFieldComponent } from '../../../shared/form-field/form-field.component';
import { SelectMenuComponent, SelectMenuOption } from '../../../shared/select-menu/select-menu.component';
import { NumberStepperComponent } from '../../../shared/number-stepper/number-stepper.component';
import { bestPurchaseDay } from '../../../core/card-metrics.model';

type CardFormField = 'brand' | 'number' | 'name' | 'limit';

/**
 * Modal de cadastro/edição de cartão.
 *
 * Vive fora da tela de cartões porque outros fluxos precisam do mesmo formulário
 * sem sair de onde estão — o principal deles é a despesa no crédito sem cartão
 * cadastrado (onboarding e tela de despesas), que abre este modal e volta ao
 * rascunho com o cartão novo já selecionado.
 *
 * O formulário pede o nome do cartão (apelido), não o titular: o PAN completo
 * nunca é guardado, só os últimos 4 dígitos.
 */
@Component({
  selector: 'app-cartao-form',
  standalone: true,
  imports: [
    FormsModule,
    DigitOnlyDirective,
    ModalComponent,
    FormFieldComponent,
    SelectMenuComponent,
    NumberStepperComponent
  ],
  templateUrl: './cartao-form.component.html',
  styleUrls: ['./cartao-form.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CartaoFormComponent implements OnInit, OnChanges {
  @Input() open = false;
  /** Cartão em edição; `null` abre o formulário em branco para cadastro. */
  @Input() card: StoredCard | null = null;

  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<CardDto>();

  readonly formId = 'card-form';

  bandeira = '';
  numero = '';
  nome = '';
  banco = '';
  limiteCredito = 0;
  limiteCreditoInput = '';
  diaFechamento = 1;
  diaVencimento = 10;
  saving = false;
  brands: CardBrandLookup[] = [];
  institutions: InstitutionLookup[] = [];

  /* O titular saiu do formulário, mas quem já tinha um gravado não pode perdê-lo
     numa edição — guardamos o valor que veio da API e devolvemos igual. */
  private holderNameOriginal = '';

  readonly cardForm = new FormState<CardFormField>(
    ['brand', 'number', 'name', 'limit'],
    () => this.validateCardForm()
  );

  constructor(
    private readonly lookupsStore: LookupsStore,
    private readonly cardsStore: CardsStore,
    private readonly uiFeedback: UiFeedbackService,
    private readonly cdr: ChangeDetectorRef
  ) {
    effect(() => {
      this.brands = this.lookupsStore.cardBrands().filter((b) => b.isActive !== false);
      if (!this.bandeira && this.brands.length) {
        this.bandeira = String(this.brands[0].id);
      }
      this.cdr.markForCheck();
    });

    effect(() => {
      this.institutions = this.lookupsStore.institutions('Bank');
      this.cdr.markForCheck();
    });
  }

  ngOnInit(): void {
    this.lookupsStore.loadCardBrands();
    this.lookupsStore.loadInstitutions('Bank');
  }

  /* Cada abertura recomeça do zero (ou dos dados do cartão em edição): o modal
     é reaproveitado entre telas e não pode carregar rascunho da vez anterior. */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open'] && this.open) {
      this.preencherFormulario();
    }
  }

  get isEdit(): boolean {
    return !!this.card?.id;
  }

  /** O selo repete o código da bandeira, como no cartão físico. */
  get brandOptions(): SelectMenuOption[] {
    return this.brands.map((brand) => ({
      value: String(brand.id),
      label: brand.name,
      badge: (brand.code || brand.name || '').toUpperCase()
    }));
  }

  /** Comprar logo depois do fechamento é o que dá mais prazo até pagar. */
  get melhorDiaDeCompra(): number {
    return bestPurchaseDay(this.diaFechamento);
  }

  get podeSalvar(): boolean {
    return this.cardForm.isValid();
  }

  trackByIndex(index: number, _item: unknown): number {
    return index;
  }

  salvar(): void {
    if (this.saving) return;
    this.cardForm.submit();

    if (!this.cardForm.isValid()) {
      this.uiFeedback.warning('Revise os campos destacados antes de salvar.');
      return;
    }

    this.saving = true;

    const nome = this.nome.trim();
    const payload: CardPayload = {
      brandId: Number(this.bandeira),
      // O titular saiu do formulário: em edição devolvemos o que já estava gravado
      // e, sem ele, repetimos o nome do cartão. A API nova aceita titular vazio,
      // mas a que está publicada ainda o exige — mandar o nome funciona nas duas.
      holderName: this.holderNameOriginal || nome,
      nickname: nome,
      last4: this.numero.replace(/\D/g, '').slice(-4),
      bank: this.banco.trim() || null,
      creditLimit: this.limiteCredito,
      statementCloseDay: this.diaFechamento,
      dueDay: this.diaVencimento
    };

    const done = (card: CardDto) => {
      this.saving = false;
      this.cdr.markForCheck();
      this.uiFeedback.success('Cartão salvo com sucesso.', 2500);
      this.saved.emit(card);
    };

    const fail = (message: string, error?: { status?: number }) => {
      this.saving = false;
      this.cdr.markForCheck();
      if (error?.status === 409) {
        this.uiFeedback.warning(message);
        return;
      }
      this.uiFeedback.error(message);
    };

    if (this.card?.id) {
      this.cardsStore.update(this.card.id, payload, done, fail);
      return;
    }

    this.cardsStore.create(payload, done, fail);
  }

  cancelar(): void {
    if (this.saving) return;
    this.close.emit();
  }

  onNumeroInput(event: Event): void {
    const target = event.target as HTMLInputElement | null;
    const digits = (target?.value ?? '').replace(/\D/g, '').slice(0, 4);
    this.numero = digits;
    if (target) target.value = digits;
  }

  /* O "R$" é prefixo fixo do campo, então o texto guarda só o número formatado. */
  onLimiteChange(value: string): void {
    const digits = (value || '').replace(/[^\d]/g, '');
    const number = Number(digits) / 100;
    this.limiteCredito = Number.isFinite(number) ? number : 0;
    this.limiteCreditoInput = maskMoneyInput(digits);
  }

  private preencherFormulario(): void {
    this.cardForm.reset();
    this.saving = false;

    const card = this.card;
    if (!card) {
      this.bandeira = this.brands[0]?.id ? String(this.brands[0].id) : '';
      this.numero = '';
      this.nome = '';
      this.banco = '';
      this.holderNameOriginal = '';
      this.limiteCredito = 0;
      this.limiteCreditoInput = '';
      this.diaFechamento = 1;
      this.diaVencimento = 10;
      return;
    }

    this.bandeira = card.bandeira;
    this.numero = (card.numero || '').replace(/\D/g, '').slice(-4);
    this.nome = card.nome;
    this.banco = card.banco || '';
    this.holderNameOriginal = card.holderName || '';
    this.limiteCredito = card.limiteCredito ?? 0;
    this.limiteCreditoInput = maskMoneyInput(String(Math.round(this.limiteCredito * 100)));
    this.diaFechamento = card.diaFechamento ?? 1;
    this.diaVencimento = card.diaVencimento ?? 10;
  }

  private validateCardForm(): Partial<Record<CardFormField, string>> {
    const errors: Partial<Record<CardFormField, string>> = {};
    const digits = this.numero.replace(/\D/g, '');
    const nome = this.nome.trim();

    if (!this.bandeira) {
      errors.brand = 'Selecione a bandeira do cartão.';
    }

    if (!digits) {
      errors.number = 'Informe os últimos 4 dígitos.';
    } else if (digits.length !== 4) {
      errors.number = 'São exatamente 4 dígitos.';
    }

    if (!nome) {
      errors.name = 'Dê um nome ao cartão.';
    } else if (nome.length < 2) {
      errors.name = 'O nome precisa ter pelo menos 2 caracteres.';
    }

    if (!Number.isFinite(this.limiteCredito) || this.limiteCredito <= 0) {
      errors.limit = 'Informe o limite de crédito.';
    }

    return errors;
  }
}
