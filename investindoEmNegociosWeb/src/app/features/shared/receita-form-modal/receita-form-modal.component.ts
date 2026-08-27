import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, EventEmitter, Input, OnInit, Output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs/operators';
import { Router } from '@angular/router';
import { ReceitasFormComponent } from '../receitas-form/receitas-form.component';
import { ApiDataService, StoredIncome } from '../../../core/data/api-data.service';
import { CategoriesService, CategoryDto } from '../../../core/categories.service';
import { UiFeedbackService } from '../../../core/ui-feedback.service';
import { maskDateDDMMYYYY, maskMoneyInput } from '../../../core/utils/input-mask';
import { formatLocaleDate, formatNumberValue, parseLocaleDate, parseLocalizedNumber } from '../../../core/utils/locale-utils';
import { extractApiErrorMessage } from '../../../core/utils/api-error.utils';

/**
 * Modal de **criação** de receita, fechado em si mesmo: quem usa só diz quando
 * abrir e recebe o aviso de que gravou.
 *
 * Existe porque o `app-receitas-form` é um painel burro — ele desenha os campos
 * e nada mais. Validação, máscaras, categorias e gravação moravam na página de
 * Receitas (1.156 linhas), então nenhuma outra tela conseguia abrir aquele
 * formulário. O Calendário precisa disso, e a página passa a usar o mesmo
 * caminho para que a regra de criação exista num lugar só.
 *
 * O molde é o `app-cartao-form`, que já era assim (`[open] … (saved)`) e já
 * servia três telas. Padrão repetido de propósito, e não inventado de novo.
 *
 * **Só cria.** Editar arrasta escopo de recorrência, comprovante e histórico,
 * que são assunto da listagem e continuam na página.
 *
 * ⚠️ O onboarding também desenha o `app-receitas-form`, com motor próprio e em
 * modo enxuto (`valorSugestao=null`, `resumoTexto=''`, `permiteCriarCategoria=false`).
 * Por isso este componente **envolve** o painel sem alterar o contrato dele — e
 * por isso o onboarding não deve ser migrado para cá: ligaria justamente as três
 * coisas que ele desligou.
 */
@Component({
  selector: 'app-receita-form-modal',
  standalone: true,
  imports: [ReceitasFormComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-receitas-form
      [mostrarForm]="open"
      [novaRenda]="novaRenda"
      [categorias]="categorias()"
      [valorInput]="valorInput"
      [recebimentoInput]="recebimentoInput"
      [erroData]="erroData"
      [erroCategoria]="erroCategoria"
      [valorSugestao]="valorSugestao()"
      [editandoId]="null"
      [resumoTexto]="resumoTexto"
      [saving]="saving"
      (valorChange)="onValorChange($event)"
      (recebimentoChange)="onRecebimentoChange($event)"
      (fonteChange)="onFonteChange($event)"
      (fixaChange)="novaRenda.fixa = $event"
      (aplicarSugestao)="aplicarSugestao()"
      (salvarForm)="salvar()"
      (categoriasRequested)="irParaCategorias()"
      (fechar)="fechar()" />
  `
})
export class ReceitaFormModalComponent implements OnInit {
  /**
   * Data que o formulário já traz preenchida. No Calendário é o dia que a pessoa
   * clicou — abrir "Nova receita" no dia 15 e ter que digitar 15/08 seria pedir
   * duas vezes a mesma informação.
   */
  @Input() dataInicial: Date | null = null;

  @Output() saved = new EventEmitter<void>();
  @Output() close = new EventEmitter<void>();

  novaRenda: StoredIncome = this.criaRenda();
  valorInput = '';
  recebimentoInput = '';
  erroData = '';
  erroCategoria = '';
  saving = false;

  readonly categorias = signal<CategoryDto[]>([]);
  readonly valorSugestao = signal<number | null>(null);

  private rendas: StoredIncome[] = [];

  constructor(
    private readonly db: ApiDataService,
    private readonly categoriesService: CategoriesService,
    private readonly uiFeedback: UiFeedbackService,
    private readonly router: Router,
    private readonly cdr: ChangeDetectorRef,
    private readonly destroyRef: DestroyRef
  ) {
    // A sugestão de "último valor desta fonte" precisa das receitas já lançadas.
    this.db.incomes$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((items) => {
      this.rendas = items || [];
    });
  }

  @Input() open = false;

  /**
   * A montagem é o gatilho — quem usa renderiza sob `@if`, então cada abertura
   * cria uma instância limpa. Isso tem que ser `ngOnInit`, e não um setter de
   * `open`: o Angular atribui os inputs na ordem em que aparecem no template, e
   * `[open]` vem antes de `[dataInicial]`. Zerar o formulário dentro do setter
   * de `open` rodava com `dataInicial` ainda nulo e a data nunca era
   * pré-preenchida — o `ngOnInit` roda depois de todos os inputs.
   */
  ngOnInit(): void {
    this.resetar();
    this.carregarCategorias();
  }

  get resumoTexto(): string {
    if (!this.valorInput) return '';
    const data = this.recebimentoInput || 'DD/MM/AAAA';
    return this.novaRenda.fixa
      ? `Recebimento de ${this.valorInput} todos os meses a partir de ${data}.`
      : `Recebimento de ${this.valorInput} em ${data}.`;
  }

  onValorChange(raw: string): void {
    this.valorInput = maskMoneyInput(raw);
  }

  onRecebimentoChange(raw: string): void {
    this.recebimentoInput = maskDateDDMMYYYY(raw);
    this.erroData = !this.recebimentoInput || this.isDataValida(this.recebimentoInput)
      ? ''
      : 'Data inválida. Use o formato DD/MM/AAAA.';
  }

  onFonteChange(fonte: string): void {
    this.novaRenda.fonte = fonte;
    this.valorSugestao.set(this.getUltimoValorParaFonte(fonte));
  }

  aplicarSugestao(): void {
    const sugestao = this.valorSugestao();
    if (!sugestao) return;
    this.valorInput = formatNumberValue(sugestao);
  }

  irParaCategorias(): void {
    this.fechar();
    this.router.navigateByUrl('/categorias');
  }

  fechar(): void {
    if (this.saving) return;
    this.close.emit();
  }

  salvar(): void {
    if (this.saving) return;

    const valor = parseLocalizedNumber(this.valorInput);
    if (!this.novaRenda.fonte) {
      this.uiFeedback.error('Informe a fonte da receita.', 3000);
      return;
    }
    if (!valor) {
      this.uiFeedback.error('Informe um valor maior que zero.', 3000);
      return;
    }
    if (!this.novaRenda.categoryId) {
      this.erroCategoria = 'Selecione uma categoria.';
      return;
    }
    this.erroCategoria = '';
    if (!this.recebimentoInput || !this.isDataValida(this.recebimentoInput)) {
      this.erroData = 'Data inválida. Use o formato DD/MM/AAAA.';
      return;
    }
    this.erroData = '';

    this.saving = true;
    this.db
      .addIncome({
        planId: '',
        fonte: this.novaRenda.fonte,
        categoryId: this.novaRenda.categoryId ?? null,
        valor,
        recebimento: maskDateDDMMYYYY(this.recebimentoInput),
        fixa: this.novaRenda.fixa
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
          // `saving` cai antes de emitir porque `fechar()` sai cedo enquanto ele
          // for true — mesmo cuidado que já existia na página e em cartões.
          this.saving = false;
          this.uiFeedback.success('Receita salva com sucesso.', 2500);
          this.saved.emit();
          this.close.emit();
        },
        error: (err) =>
          this.uiFeedback.error(extractApiErrorMessage(err, 'Não foi possível salvar a receita.'), 4000)
      });
  }

  private resetar(): void {
    this.novaRenda = this.criaRenda();
    this.valorInput = '';
    this.recebimentoInput = this.dataInicial ? formatLocaleDate(this.dataInicial) : '';
    this.erroData = '';
    this.erroCategoria = '';
    this.valorSugestao.set(null);
  }

  private criaRenda(): StoredIncome {
    return {
      id: '',
      planId: '',
      fonte: '',
      categoria: '',
      categoryId: null,
      valor: 0,
      recebimento: '',
      fixa: false,
      fixaInicio: ''
    };
  }

  private isDataValida(value: string): boolean {
    return !!parseLocaleDate(value);
  }

  private getUltimoValorParaFonte(fonte: string): number | null {
    if (!fonte) return null;
    const needle = fonte.trim().toLowerCase();
    const candidatas = this.rendas.filter((r) => (r.fonte || '').trim().toLowerCase() === needle);
    if (!candidatas.length) return null;
    const ordenadas = [...candidatas].sort(
      (a, b) => (parseLocaleDate(b.recebimento)?.getTime() || 0) - (parseLocaleDate(a.recebimento)?.getTime() || 0)
    );
    return ordenadas[0].valor;
  }

  /**
   * Categorias de receita. O fallback para a lista completa é o mesmo da página:
   * base sem `appliesTo` preenchido devolveria lista vazia e travaria o salvamento,
   * já que categoria é obrigatória.
   */
  private carregarCategorias(): void {
    const filtra = (items: CategoryDto[]) =>
      (items || [])
        .filter((item) => item.isActive !== false)
        .filter((item) => {
          const applies = (item.appliesTo || '').toString().toLowerCase().trim();
          return applies.includes('income') || applies.includes('receita') || applies.includes('renda');
        });

    this.categoriesService
      .list('Income')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (items) => {
          const filtradas = filtra(items || []);
          if (filtradas.length) {
            this.categorias.set(filtradas);
            this.cdr.markForCheck();
            return;
          }
          this.categoriesService
            .list()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
              next: (all) => {
                this.categorias.set(filtra(all || []));
                this.cdr.markForCheck();
              },
              error: () => this.categorias.set([])
            });
        },
        error: () => this.categorias.set([])
      });
  }
}
