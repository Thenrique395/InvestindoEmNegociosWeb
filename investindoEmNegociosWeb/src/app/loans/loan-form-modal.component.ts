import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, EventEmitter, Input, OnInit, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  LoanAmortizationType,
  LoanContractRequest,
  LoanContractResponse,
  LoanInstallmentResponse,
  LoanSimulationComparison,
  LoanSimulationResponse,
  LoansService
} from '../loans.service';
import { UiFeedbackService } from '../ui-feedback.service';
import { ModalComponent } from '../shared/modal/modal.component';
import { FormFieldComponent } from '../shared/form-field/form-field.component';
import { DatePickerComponent } from '../shared/date-picker/date-picker.component';
import { SegmentedSelectorComponent, SegmentOption } from '../shared/segmented-selector/segmented-selector.component';
import { ResponsiveListComponent, ResponsiveListColumn } from '../shared/responsive-list/responsive-list.component';
import { ResponsiveListCellDirective } from '../shared/responsive-list/responsive-list-cell.directive';
import { AppCurrencyPipe } from '../shared/app-currency.pipe';
import { extractApiErrorMessage } from '../utils/api-error.utils';

/**
 * Modal de contrato de empréstimo/financiamento, fechado em si mesmo.
 * Irmão do `app-receita-form-modal`; atende criação **e** edição via `[contract]`,
 * como o `app-cartao-form` faz com `[card]`.
 *
 * Traz junto a simulação e a comparação PRICE × SAC, porque elas rodam sobre o
 * rascunho do formulário — separá-las obrigaria a expor o rascunho inteiro para
 * fora, que é justamente o acoplamento que este componente veio desfazer.
 * Simular e comparar só aparecem na criação: em contrato existente, mexer nos
 * números recalcula o cronograma de verdade, e não em rascunho.
 */
@Component({
  selector: 'app-loan-form-modal',
  standalone: true,
  imports: [
    FormsModule,
    DatePipe,
    ModalComponent,
    FormFieldComponent,
    DatePickerComponent,
    SegmentedSelectorComponent,
    ResponsiveListComponent,
    ResponsiveListCellDirective,
    AppCurrencyPipe
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-modal
      [open]="true"
      [eyebrow]="contract ? 'Editar contrato' : 'Novo contrato'"
      [title]="contract ? 'Atualize o contrato' : 'Novo empréstimo ou financiamento'"
      subtitle="Preencha os dados e simule antes de salvar. Nada é registrado sem confirmação."
      size="lg"
      (close)="fechar()">

      <form class="loan-form" modal-body (ngSubmit)="salvar()">
        <section class="loan-form__section">
          <div class="loan-form__section-head"><h4>Identificação</h4></div>
          <div class="loan-form__grid">
            <app-form-field label="Título" class="loan-form__field--full">
              <input class="loan-form__control" type="text" name="title" [(ngModel)]="form.title"
                placeholder="Ex: Empréstimo pessoal, financiamento do carro..." />
            </app-form-field>
          </div>
        </section>

        <section class="loan-form__section">
          <div class="loan-form__section-head"><h4>Valores e condições</h4></div>
          <div class="loan-form__grid">
            <app-form-field label="Valor (R$)">
              <input class="loan-form__control" type="number" min="0" name="principal" [(ngModel)]="form.principalAmount" />
            </app-form-field>
            <app-form-field label="Juros ao ano (%)">
              <input class="loan-form__control" type="number" step="0.01" name="rate" [(ngModel)]="form.annualInterestRate" />
            </app-form-field>
            <app-form-field label="Prazo (meses)">
              <input class="loan-form__control" type="number" min="1" name="term" [(ngModel)]="form.termMonths" />
            </app-form-field>
            <app-form-field label="Dia de pagamento" hint="1 a 28">
              <input class="loan-form__control" type="number" min="1" max="28" name="paymentDay" [(ngModel)]="form.paymentDay" />
            </app-form-field>
            <app-form-field label="Data inicial">
              <app-date-picker format="iso" [value]="form.startDate" (valueChange)="form.startDate = $event" ariaLabel="Data inicial" />
            </app-form-field>
            <app-form-field label="Sistema de amortização" class="loan-form__field--full">
              <app-segmented-selector
                ariaLabel="Sistema de amortização"
                [options]="amortizationOptions"
                [value]="form.amortizationType"
                (valueChange)="setAmortization($event)" />
            </app-form-field>
          </div>
        </section>

        @if (error()) {
          <p class="loan-form__error" role="alert">{{ error() }}</p>
        }

        @if (comparison(); as cmp) {
          <section class="loan-form__section">
            <div class="loan-form__section-head">
              <h4>PRICE × SAC</h4>
              <p class="muted text--sm">Mesmos parâmetros, dois sistemas — escolha para seguir.</p>
            </div>
            <div class="compare-grid">
              @for (opt of [{ key: 'Price', label: 'PRICE', sim: cmp.price }, { key: 'Sac', label: 'SAC', sim: cmp.sac }]; track opt.key) {
                <div class="compare-col">
                  <h3>{{ opt.label }}</h3>
                  <dl>
                    <div><dt>Parcela inicial</dt><dd>{{ opt.sim.installments[0].totalAmount | appCurrency }}</dd></div>
                    <div><dt>Parcela final</dt><dd>{{ opt.sim.installments[opt.sim.installments.length - 1].totalAmount | appCurrency }}</dd></div>
                    <div><dt>Custo total</dt><dd>{{ opt.sim.totalCost | appCurrency }}</dd></div>
                    <div><dt>Juros totais</dt><dd>{{ opt.sim.totalInterest | appCurrency }}</dd></div>
                  </dl>
                  <button type="button" class="btn-primary sm" (click)="chooseSystem($any(opt.key))">Escolher {{ opt.label }}</button>
                </div>
              }
            </div>
          </section>
        } @else if (simulation(); as s) {
          <section class="loan-form__section">
            <div class="loan-form__section-head"><h4>Simulação</h4></div>
            <div class="kpis">
              <div><span>Parcela inicial</span><strong>{{ s.monthlyPayment | appCurrency }}</strong></div>
              <div><span>Custo total</span><strong>{{ s.totalCost | appCurrency }}</strong></div>
              <div><span>Juros totais</span><strong>{{ s.totalInterest | appCurrency }}</strong></div>
            </div>
            <app-responsive-list
              [columns]="simulationColumns"
              [items]="s.installments.slice(0, 6)"
              [getId]="trackInstallment"
              emptyIcon="$"
              emptyTitle="Sem parcelas simuladas"
              emptyDescription="Ajuste os dados do contrato e simule novamente.">
              <ng-template appResponsiveListCell="number" let-item>
                <span class="installment-number">{{ item.installmentNo }}</span>
              </ng-template>
              <ng-template appResponsiveListCell="dueDate" let-item>
                {{ item.dueDate | date:'dd/MM/yyyy' }}
              </ng-template>
              <ng-template appResponsiveListCell="principal" let-item>
                {{ item.principalAmount | appCurrency }}
              </ng-template>
              <ng-template appResponsiveListCell="interest" let-item>
                {{ item.interestAmount | appCurrency }}
              </ng-template>
              <ng-template appResponsiveListCell="total" let-item>
                {{ item.totalAmount | appCurrency }}
              </ng-template>
              <ng-template appResponsiveListCell="balance" let-item>
                {{ item.endingBalance | appCurrency }}
              </ng-template>
            </app-responsive-list>
          </section>
        }
      </form>

      <div class="loan-form__footer" modal-footer>
        @if (!contract) {
          <button class="btn-ghost" type="button" (click)="simulate()">Simular</button>
          <button class="btn-ghost" type="button" (click)="compare()" [disabled]="comparing()">
            {{ comparing() ? 'Comparando...' : 'Comparar PRICE × SAC' }}
          </button>
        }
        <span class="loan-form__footer-spacer"></span>
        <button class="btn-ghost" type="button" (click)="fechar()">Cancelar</button>
        <button class="btn-primary" type="button" (click)="salvar()" [disabled]="saving()">
          {{ saving() ? 'Salvando...' : (contract ? 'Salvar alterações' : 'Criar contrato') }}
        </button>
      </div>
    </app-modal>
  `,
  styles: `
.kpis {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.8rem;
  margin-top: 0.8rem;
}

.kpis > div {
  padding: 0.85rem;
  border-radius: var(--radius-inner);
  background: var(--surface-sunken);
  border: 1px solid var(--border);
}

.kpis span {
  display: block;
  color: var(--text-tertiary);
  font-size: var(--fs-caption);
  font-weight: var(--fw-bold);
  letter-spacing: var(--ls-column);
  margin-bottom: 0.25rem;
  text-transform: uppercase;
}

.kpis strong {
  color: var(--text);
  font-size: var(--fs-card-title);
}

.installment-number {
  color: var(--text);
  font-weight: var(--fw-bold);
  font-variant-numeric: tabular-nums;
}

.compare-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.compare-col {
  border: 1px solid var(--border);
  border-radius: 0.75rem;
  padding: 0.85rem;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;

  h3 { margin: 0; }
  dl { margin: 0; display: flex; flex-direction: column; gap: 0.3rem; }
  dl div { display: flex; justify-content: space-between; gap: 0.5rem; }
  dt { color: var(--text-tertiary); font-size: 0.85rem; }
  dd { margin: 0; font-weight: 600; }
}

/* Modal de novo contrato / edição */
.loan-form {
  display: flex;
  flex-direction: column;
  gap: 1.4rem;
}

.loan-form__section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.loan-form__section-head h4 {
  margin: 0;
  color: var(--text);
  font-size: var(--fs-subhead);
  letter-spacing: var(--ls-tight);
}

.loan-form__section-head p { margin: 0.15rem 0 0; }

.loan-form__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.9rem;
}

.loan-form__field--full { grid-column: 1 / -1; }

.loan-form__control { width: 100%; box-sizing: border-box; }

.loan-form__error {
  margin: 0;
  color: var(--expense-text);
  font-size: var(--fs-caption);
  font-weight: var(--fw-semibold);
}

.loan-form__footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.55rem;
}

.loan-form__footer-spacer { flex: 1 1 auto; }

@media (max-width: 640px) {
  .compare-grid { grid-template-columns: minmax(0, 1fr); }
}

@media (max-width: 560px) {
  .loan-form__grid { grid-template-columns: minmax(0, 1fr); }
}
  `
})
export class LoanFormModalComponent implements OnInit {
  /** Contrato a editar. `null` cria um novo. */
  @Input() contract: LoanContractResponse | null = null;

  /**
   * Dia de referência (no Calendário, o dia clicado). Vira a data inicial e o
   * dia de pagamento — limitado a 28, que é o teto aceito pelo contrato.
   */
  @Input() dataInicial: Date | null = null;

  @Output() saved = new EventEmitter<LoanContractResponse>();
  @Output() close = new EventEmitter<void>();

  readonly simulation = signal<LoanSimulationResponse | null>(null);
  readonly comparison = signal<LoanSimulationComparison | null>(null);
  readonly comparing = signal(false);
  readonly saving = signal(false);
  readonly error = signal('');

  form: LoanContractRequest = this.defaultForm();

  readonly amortizationOptions: SegmentOption[] = [
    { value: 'Price', label: 'PRICE' },
    { value: 'Sac', label: 'SAC' }
  ];

  readonly simulationColumns: ResponsiveListColumn[] = [
    { key: 'number', label: '#' },
    { key: 'dueDate', label: 'Vencimento' },
    { key: 'principal', label: 'Principal', align: 'end' },
    { key: 'interest', label: 'Juros', align: 'end' },
    { key: 'total', label: 'Total', align: 'end' },
    { key: 'balance', label: 'Saldo', align: 'end' }
  ];

  readonly trackInstallment = (installment: LoanInstallmentResponse): string => installment.id;

  constructor(
    private readonly loansService: LoansService,
    private readonly uiFeedback: UiFeedbackService,
    private readonly cdr: ChangeDetectorRef,
    private readonly destroyRef: DestroyRef
  ) {}

  ngOnInit(): void {
    this.form = this.contract ? this.formFromContract(this.contract) : this.defaultForm();
  }

  setAmortization(value: string): void {
    this.form.amortizationType = value as LoanAmortizationType;
  }

  simulate(): void {
    this.error.set('');
    this.comparison.set(null);
    this.loansService.simulate(this.form).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (result) => {
        this.simulation.set(result);
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.error.set(extractApiErrorMessage(err, 'Falha ao simular empréstimo.'));
        this.cdr.markForCheck();
      }
    });
  }

  compare(): void {
    this.error.set('');
    this.simulation.set(null);
    this.comparing.set(true);
    this.loansService.compare(this.form).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (result) => {
        this.comparison.set(result);
        this.comparing.set(false);
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.comparing.set(false);
        this.error.set(extractApiErrorMessage(err, 'Falha ao comparar sistemas.'));
        this.cdr.markForCheck();
      }
    });
  }

  /** Escolhe um sistema a partir da comparação e mostra a simulação escolhida. */
  chooseSystem(type: LoanAmortizationType): void {
    const cmp = this.comparison();
    if (!cmp) return;
    this.form.amortizationType = type;
    this.simulation.set(type === 'Sac' ? cmp.sac : cmp.price);
    this.comparison.set(null);
    this.cdr.markForCheck();
  }

  fechar(): void {
    if (this.saving()) return;
    this.close.emit();
  }

  salvar(): void {
    if (this.saving()) return;
    this.error.set('');
    this.saving.set(true);

    const op = this.contract
      ? this.loansService.update(this.contract.id, this.form)
      : this.loansService.create(this.form);
    const mensagem = this.contract
      ? 'Contrato atualizado com cronograma recalculado.'
      : 'Empréstimo criado com cronograma calculado.';

    op.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (result) => {
        this.saving.set(false);
        this.uiFeedback.success(mensagem);
        this.saved.emit(result);
        this.close.emit();
      },
      error: (err) => {
        this.error.set(extractApiErrorMessage(err, this.contract ? 'Falha ao atualizar contrato.' : 'Falha ao criar empréstimo.'));
        this.saving.set(false);
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * Valores de exemplo, como na página: o formulário abre já simulável, então
   * dá para apertar "Simular" e entender o produto antes de digitar os próprios
   * números. Esvaziar isso mudaria o comportamento de quem já usa a tela.
   */
  private defaultForm(): LoanContractRequest {
    return {
      title: 'Empréstimo pessoal',
      principalAmount: 10000,
      annualInterestRate: 18,
      termMonths: 24,
      amortizationType: 'Price',
      startDate: this.dataInicial
        ? this.dataInicial.toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10),
      paymentDay: this.dataInicial ? Math.min(this.dataInicial.getDate(), 28) : 10
    };
  }

  private formFromContract(contract: LoanContractResponse): LoanContractRequest {
    return {
      title: contract.title,
      principalAmount: contract.principalAmount,
      annualInterestRate: contract.annualInterestRate,
      termMonths: contract.termMonths,
      amortizationType: contract.amortizationType,
      startDate: contract.startDate,
      paymentDay: contract.paymentDay
    };
  }
}
