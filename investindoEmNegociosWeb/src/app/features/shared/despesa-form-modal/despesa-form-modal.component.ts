import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, EventEmitter, Input, OnInit, Output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs/operators';
import { Router } from '@angular/router';
import { DespesasFormComponent } from '../despesas-form/despesas-form.component';
import { CartaoFormComponent } from '../cartao-form/cartao-form.component';
import { ApiDataService, StoredCard, StoredExpense } from '../../../core/data/api-data.service';
import { CategoriesService, CategoryDto } from '../../../core/categories.service';
import { LookupsService, PaymentMethodLookup } from '../../../core/lookups.service';
import { CardDto } from '../../../core/cards.service';
import { UiFeedbackService } from '../../../core/ui-feedback.service';
import { maskDateDDMMYYYY, maskMoneyInput } from '../../../core/utils/input-mask';
import { formatLocaleDate, formatNumberValue, parseLocaleDate, parseLocalizedNumber } from '../../../core/utils/locale-utils';
import { extractApiErrorMessage } from '../../../core/utils/api-error.utils';
import { cardLabel } from '../../../core/utils/card-label';

/**
 * Modal de **criação** de despesa, fechado em si mesmo. Irmão do
 * `app-receita-form-modal`; ver lá a razão de existir e a restrição do onboarding,
 * que também desenha o `app-despesas-form` com motor próprio e em modo enxuto.
 *
 * Traz junto o cadastro de cartão embutido: quem escolhe crédito sem ter cartão
 * cadastrado não deve ser mandado para /cartoes e perder o que já preencheu.
 * O `app-cartao-form` abre por cima, e ao gravar o cartão novo já volta escolhido.
 */
@Component({
  selector: 'app-despesa-form-modal',
  standalone: true,
  imports: [DespesasFormComponent, CartaoFormComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-despesas-form
      [mostrarForm]="open && !mostrarCartaoForm"
      [categorias]="categorias()"
      [cartoes]="cartoes()"
      [novaDespesa]="novaDespesa"
      [valorInput]="valorInput"
      [valorParcelaLabel]="valorParcelaLabel"
      [vencimentoInput]="vencimentoInput"
      [erroData]="erroData"
      [erroCategoria]="erroCategoria"
      [formaPagamento]="formaPagamento"
      [paymentMethods]="paymentMethods()"
      [formaPagamentoId]="formaPagamentoId"
      [parcelar]="parcelar"
      [parcelasCount]="parcelasCount"
      [saving]="saving"
      [cartaoSelecionadoId]="cartaoSelecionadoId"
      [cartaoSelecionadoLabel]="cartaoSelecionadoLabel"
      [cardBrandMap]="cardBrandMap()"
      [fixa]="fixa"
      [fixaMeses]="fixaMeses"
      [isEdit]="false"
      (valorChange)="onValorChange($event)"
      (vencimentoChange)="onVencimentoChange($event)"
      (formaPagamentoChange)="onFormaPagamentoChange($event)"
      (formaPagamentoIdChange)="formaPagamentoId = $event"
      (parcelarChange)="parcelar = $event"
      (parcelasChange)="parcelasCount = +$event"
      (cartaoChange)="cartaoSelecionadoId = $event"
      (fixaChange)="onFixaToggle($event)"
      (fixaMesesChange)="onFixaMesesChange($event)"
      (submitForm)="salvar()"
      (categoriasRequested)="irParaCategorias()"
      (cadastrarCartaoRequested)="abrirCadastroCartao()"
      (cancel)="fechar()" />

    @if (mostrarCartaoForm) {
      <app-cartao-form
        [open]="true"
        [card]="null"
        (saved)="onCartaoCriado($event)"
        (close)="fecharCadastroCartao()" />
    }
  `
})
export class DespesaFormModalComponent implements OnInit {
  /** Data que o formulário já traz preenchida — no Calendário, o dia clicado. */
  @Input() dataInicial: Date | null = null;

  @Output() saved = new EventEmitter<void>();
  @Output() close = new EventEmitter<void>();

  novaDespesa: StoredExpense = this.criaDespesa();
  valorInput = '';
  vencimentoInput = '';
  erroData = '';
  erroCategoria = '';
  formaPagamento: 'avista' | 'cartao' = 'avista';
  formaPagamentoId: number | null = null;
  parcelar = false;
  parcelasCount = 1;
  fixa = false;
  fixaMeses: number | null = null;
  cartaoSelecionadoId: string | null = null;
  saving = false;
  mostrarCartaoForm = false;

  readonly categorias = signal<CategoryDto[]>([]);
  readonly cartoes = signal<StoredCard[]>([]);
  readonly paymentMethods = signal<PaymentMethodLookup[]>([]);
  readonly cardBrandMap = signal<Record<string, string>>({});

  private categoriaMap = new Map<string, string>();

  constructor(
    private readonly db: ApiDataService,
    private readonly categoriesService: CategoriesService,
    private readonly lookupsService: LookupsService,
    private readonly uiFeedback: UiFeedbackService,
    private readonly router: Router,
    private readonly cdr: ChangeDetectorRef,
    private readonly destroyRef: DestroyRef
  ) {
    this.db.cards$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((cards) => {
      this.cartoes.set(cards || []);
      if (cards?.length && !this.cartaoSelecionadoId) this.cartaoSelecionadoId = cards[0].id;
      if (!cards?.length) this.cartaoSelecionadoId = null;
      this.cdr.markForCheck();
    });
  }

  @Input() open = false;

  /**
   * Ver a nota em `receita-form-modal`: inicializar aqui, e não num setter de
   * `open`, é o que garante que `dataInicial` já chegou — o Angular atribui os
   * inputs na ordem do template e `[open]` vem primeiro.
   */
  ngOnInit(): void {
    this.resetar();
    this.carregarApoio();
  }

  get valorParcelaLabel(): string {
    const valor = parseLocalizedNumber(this.valorInput);
    if (!valor) return this.valorInput;
    const parcelas = this.parcelar && this.parcelasCount > 1 ? this.parcelasCount : 1;
    return formatNumberValue(valor / parcelas);
  }

  get cartaoSelecionadoLabel(): string {
    return cardLabel(this.cartoes().find((c) => c.id === this.cartaoSelecionadoId), this.cardBrandMap());
  }

  onValorChange(raw: string): void {
    this.valorInput = maskMoneyInput(raw);
  }

  onVencimentoChange(raw: string): void {
    this.vencimentoInput = maskDateDDMMYYYY(raw);
    this.erroData = !this.vencimentoInput || this.isDataValida(this.vencimentoInput)
      ? ''
      : 'Data inválida. Use o formato DD/MM/AAAA.';
  }

  /** Crédito e "despesa fixa" não convivem: a fatura já repete o lançamento. */
  onFormaPagamentoChange(value: 'avista' | 'cartao'): void {
    this.formaPagamento = value;
    if (value === 'cartao') {
      this.fixa = false;
      this.fixaMeses = null;
      this.parcelar = this.parcelasCount > 1 ? true : this.parcelar;
      if (!this.cartaoSelecionadoId && this.cartoes().length) {
        this.cartaoSelecionadoId = this.cartoes()[0].id;
      }
      return;
    }
    this.parcelar = false;
    this.parcelasCount = 1;
    this.cartaoSelecionadoId = null;
  }

  onFixaToggle(value: boolean): void {
    this.fixa = value;
    if (!value) this.fixaMeses = null;
  }

  onFixaMesesChange(value: number | null): void {
    this.fixaMeses = value === null || value === undefined || Number.isNaN(value) ? null : value;
  }

  irParaCategorias(): void {
    this.fechar();
    this.router.navigateByUrl('/categorias');
  }

  abrirCadastroCartao(): void {
    if (this.saving) return;
    this.mostrarCartaoForm = true;
  }

  fecharCadastroCartao(): void {
    this.mostrarCartaoForm = false;
    this.cdr.markForCheck();
  }

  onCartaoCriado(card: CardDto): void {
    this.mostrarCartaoForm = false;
    // Entra na lista na hora para o select já abrir com ele escolhido; o stream
    // de cartões confirma logo em seguida.
    if (card?.id) {
      this.cartoes.set([...this.cartoes(), card as unknown as StoredCard]);
      this.cartaoSelecionadoId = card.id;
      this.formaPagamento = 'cartao';
    }
    this.cdr.markForCheck();
  }

  fechar(): void {
    if (this.saving) return;
    this.close.emit();
  }

  salvar(): void {
    if (this.saving) return;

    const valor = parseLocalizedNumber(this.valorInput);
    if (!this.novaDespesa.nome) {
      this.uiFeedback.error('Informe o nome da despesa.', 3000);
      return;
    }
    if (!valor) {
      this.uiFeedback.error('Informe um valor maior que zero.', 3000);
      return;
    }
    if (!this.novaDespesa.categoryId) {
      this.erroCategoria = 'Selecione uma categoria.';
      return;
    }
    this.erroCategoria = '';

    const dataBase = parseLocaleDate(maskDateDDMMYYYY(this.vencimentoInput));
    if (!this.isDataValida(this.vencimentoInput) || !dataBase) {
      this.erroData = 'Data inválida. Use o formato DD/MM/AAAA.';
      return;
    }
    this.erroData = '';

    // Mesmos limites da página: parcela no cartão até 36 e duração fixa até 120
    // meses, para não gerar parcela em massa nem estourar o teto do backend.
    const parcelas = this.parcelar && this.parcelasCount > 1
      ? Math.min(Math.max(Math.trunc(this.parcelasCount), 2), 36)
      : 1;
    const fixaMeses = this.fixa && this.fixaMeses
      ? Math.min(Math.max(Math.trunc(this.fixaMeses), 1), 120)
      : null;
    const serieId = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`;

    this.saving = true;
    this.db
      .addExpense({
        nome: this.novaDespesa.nome,
        categoria: this.resolveCategoriaNome(this.novaDespesa),
        categoryId: this.novaDespesa.categoryId ?? null,
        valor: Number(valor.toFixed(2)),
        vencimento: formatLocaleDate(dataBase),
        cartao: this.formaPagamento === 'cartao' ? this.cartaoSelecionadoId ?? undefined : undefined,
        paymentMethodId: this.formaPagamentoId,
        parcelaNumero: parcelas > 1 ? 1 : undefined,
        parcelasTotal: parcelas > 1 ? parcelas : undefined,
        serieId: parcelas > 1 ? serieId : undefined,
        fixa: this.fixa,
        fixaMeses
      })
      .pipe(
        finalize(() => {
          this.saving = false;
          this.cdr.markForCheck();
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: () => {
          this.saving = false;
          this.uiFeedback.success('Despesa salva com sucesso.', 2500);
          this.saved.emit();
          this.close.emit();
        },
        error: (err) =>
          this.uiFeedback.error(extractApiErrorMessage(err, 'Não foi possível salvar a despesa.'), 4000)
      });
  }

  private resetar(): void {
    this.novaDespesa = this.criaDespesa();
    this.valorInput = '';
    this.vencimentoInput = this.dataInicial ? formatLocaleDate(this.dataInicial) : '';
    this.erroData = '';
    this.erroCategoria = '';
    this.parcelar = false;
    this.parcelasCount = 1;
    this.fixa = false;
    this.fixaMeses = null;
    this.formaPagamento = 'avista';
    this.formaPagamentoId = null;
    this.mostrarCartaoForm = false;
    this.cartaoSelecionadoId = this.cartoes()[0]?.id || null;
  }

  private criaDespesa(): StoredExpense {
    return { id: '', nome: '', categoria: '', categoryId: null, valor: 0, vencimento: '' };
  }

  private isDataValida(value: string): boolean {
    return !!parseLocaleDate(value);
  }

  private resolveCategoriaNome(expense: Pick<StoredExpense, 'categoryId' | 'categoria'>): string {
    const byId = expense.categoryId ? this.categoriaMap.get(expense.categoryId) : null;
    if (byId) return byId;
    return expense.categoria || 'Outros';
  }

  /** Categorias, formas de pagamento e bandeiras usadas pelo formulário. */
  private carregarApoio(): void {

    this.categoriesService
      .list('Expense')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          const filtradas = (data || []).filter((item) => {
            const applies = (item.appliesTo || '').toString().toLowerCase();
            return applies === 'expense' || applies === 'despesa' || applies === 'despesas';
          });
          this.categorias.set(filtradas);
          this.categoriaMap = new Map(filtradas.map((c) => [c.id, c.name]));
          this.cdr.markForCheck();
        },
        error: () => {
          this.categorias.set([]);
          this.categoriaMap = new Map();
          this.cdr.markForCheck();
        }
      });

    this.lookupsService
      .paymentMethods()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (methods) => {
          this.paymentMethods.set(methods || []);
          this.cdr.markForCheck();
        },
        error: () => this.paymentMethods.set([])
      });

    this.lookupsService
      .cardBrands()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (brands) => {
          const next: Record<string, string> = {};
          for (const brand of brands || []) {
            const readable = (brand.name || brand.code || '').trim();
            if (readable) next[String(brand.id)] = readable;
          }
          this.cardBrandMap.set(next);
          this.cdr.markForCheck();
        },
        error: () => this.cardBrandMap.set({})
      });
  }
}
