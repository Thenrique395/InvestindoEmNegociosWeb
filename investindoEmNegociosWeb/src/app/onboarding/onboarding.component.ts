import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, ValidatorFn, AbstractControl, FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ProfileService } from '../profile.service';
import { OnboardingService } from '../onboarding.service';
import { FocusArea, IntelligenceMode } from './onboarding.types';
import { UiFeedbackService } from '../ui-feedback.service';
import { AuthService } from '../auth.service';
import { AccountRequest, AccountType, AccountsService } from '../accounts.service';
import { CardsService } from '../cards.service';
import { CreatePlanPayload, PlansService } from '../plans.service';
import { CategoriesService, CategoryDto } from '../categories.service';
import { hasAtLeastRole, UserRole } from '../roles';
import { StoredCard, StoredExpense, StoredIncome } from '../data/api-data.service';
import { UiPermissionsService } from '../ui-permissions.service';
import { ReceitasFormComponent } from '../receitas/receitas-form.component';
import { DespesasFormComponent } from '../despesas/despesas-form.component';
import { maskDateDDMMYYYY, maskMoneyInput } from '../utils/input-mask';
import { parseLocaleDate, parseLocalizedNumber } from '../utils/locale-utils';
import { extractApiErrorMessage } from '../utils/api-error.utils';
import {
  accountTypeLabel,
  brToIso,
  createExpenseDraft,
  createIncomeDraft,
  isoToBr,
  maskPhone,
  toStoredCard,
  todayIso
} from './onboarding.helpers';
import { cpfValidator, maskCpf } from '../utils/cpf.utils';
import { OnboardingDraftService } from './onboarding-draft.service';
import { DatePickerComponent } from '../shared/date-picker/date-picker.component';

@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, ReceitasFormComponent, DespesasFormComponent, DatePickerComponent],
  templateUrl: './onboarding.component.html',
  styleUrls: ['./onboarding.component.scss']
})
export class OnboardingComponent implements OnInit {
  form: FormGroup;
  loading = false;
  creatingAccount = false;
  savingEntries = false;
  liveMessage = '';
  readonly totalSteps = 4;
  readonly minBirthDate = '1900-01-01';
  // Getter (não readonly): recalcula "hoje" a cada acesso, evitando ficar preso na
  // data em que a página foi aberta caso a sessão atravesse a meia-noite.
  get maxBirthDate(): string {
    return todayIso();
  }
  step = 0;
  focus: FocusArea | null = null;
  intelligenceMode: IntelligenceMode | null = null;
  carryOverDay = 1;
  readonly carryOverDayOptions = Array.from({ length: 31 }, (_, i) => i + 1);
  readonly intelligenceModeOptions: { id: IntelligenceMode; title: string; description: string; tooltip: string; icon: 'balance' | 'shield' }[] = [
    {
      id: 'B',
      title: 'Balanceado',
      description: 'Orientações objetivas para manter equilíbrio entre controle, organização e crescimento.',
      tooltip: 'Ideal para quem quer começar com orientação prática, sem excesso de alertas e sem perder visão de evolução financeira.',
      icon: 'balance'
    },
    {
      id: 'C',
      title: 'Conservador',
      description: 'Foco maior em segurança de caixa, redução de risco e preservação financeira.',
      tooltip: 'Indicado para quem prefere um início mais cauteloso, com atenção maior ao caixa, estabilidade e prevenção de imprevistos.',
      icon: 'shield'
    }
  ];
  focusOptions: { id: FocusArea; title: string; description: string; tooltip: string; icon: 'growth' | 'debt' | 'invest' | 'shield' }[] = [
    {
      id: 'vida-financeira',
      title: 'Melhorar vida financeira',
      description: 'Criar rotina para gastar melhor e ter mais controle no mês.',
      tooltip: 'Essa direção ajuda a organizar a rotina financeira do mês, com mais clareza sobre entradas, saídas, orçamento e previsibilidade.',
      icon: 'growth'
    },
    {
      id: 'sair-dividas',
      title: 'Sair das dívidas',
      description: 'Priorizar pagamentos e reduzir pressão financeira.',
      tooltip: 'Essa escolha prioriza quitar dívidas com mais estratégia, acompanhando juros, parcelas e evolução da quitação.',
      icon: 'debt'
    },
    {
      id: 'comecar-investir',
      title: 'Começar a investir',
      description: 'Organizar sobra mensal para iniciar aportes com consistência.',
      tooltip: 'Essa direção ajuda a gerar sobra recorrente no mês para transformar parte do dinheiro em aportes com constância.',
      icon: 'invest'
    },
    {
      id: 'reserva-emergencia',
      title: 'Criar reserva de emergência',
      description: 'Montar segurança para imprevistos antes de assumir mais risco.',
      tooltip: 'Essa opção foca em construir uma proteção financeira para imprevistos, reduzindo a dependência de crédito em momentos de aperto.',
      icon: 'shield'
    }
  ];
  accountReady = false;
  hasDocument = false;
  accountForm: AccountRequest = {
    name: '',
    type: 'Checking',
    initialBalance: 0,
    isActive: true,
    currency: 'BRL'
  };
  accountTypes: AccountType[] = ['Checking', 'Savings', 'DigitalWallet', 'Cash', 'Other'];
  expenseCategories: CategoryDto[] = [];
  incomeCategories: CategoryDto[] = [];
  showIncomeModal = false;
  showExpenseModal = false;
  savingIncomeModal = false;
  savingExpenseModal = false;
  showStep4Validation = false;
  modalIncome: StoredIncome = createIncomeDraft();
  modalIncomeAmountInput = '';
  modalIncomeDateInput = '';
  modalIncomeDateError = '';
  modalIncomeCategoryError = '';
  modalExpense: StoredExpense = createExpenseDraft();
  modalExpenseAmountInput = '';
  modalExpenseDateInput = '';
  modalExpenseDateError = '';
  modalExpenseCategoryError = '';
  modalExpenseFormaPagamento: 'avista' | 'cartao' = 'avista';
  modalExpenseParcelar = false;
  modalExpenseParcelas = 1;
  modalExpenseFixa = false;
  modalExpenseFixaMeses: number | null = null;
  modalExpenseCartaoId: string | null = null;
  modalExpenseCartoes: StoredCard[] = [];
  cardsCount = 0;
  initialIncome = { source: '', amount: 0, receivedOn: '' };
  initialExpense = { name: '', amount: 0, dueDate: '', categoryId: null as string | null };

  constructor(
    private fb: FormBuilder,
    private profile: ProfileService,
    private router: Router,
    private onboarding: OnboardingService,
    private uiFeedback: UiFeedbackService,
    private authService: AuthService,
    private accountsService: AccountsService,
    private cardsService: CardsService,
    private plansService: PlansService,
    private categoriesService: CategoriesService,
    private uiPermissions: UiPermissionsService,
    private onboardingDraft: OnboardingDraftService
  ) {
    this.form = this.fb.group({
      fullName: ['', [Validators.required, Validators.minLength(3), this.noBlankValidator()]],
      document: ['', [Validators.required, cpfValidator()]],
      phone: ['', [Validators.required, this.phoneValidator()]],
      birthDate: ['', [Validators.required, this.birthDateRangeValidator()]],
      city: ['', [Validators.required, this.noBlankValidator()]],
      state: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(2), this.noBlankValidator()]],
      country: ['', [Validators.required, this.noBlankValidator()]]
    });

  }

  ngOnInit(): void {
    this.restoreDraft();

    this.onboarding.getStatus().subscribe({
      next: (status) => {
        if (status.completed) {
          this.router.navigateByUrl('/dashboard');
          return;
        }
        this.step = Math.min(Math.max(status.step || 0, 0), this.totalSteps - 1);
        this.loadProfile(true);
      },
      error: () => {
        this.loadProfile(true);
      }
    });

    this.accountsService.list().subscribe({
      next: (accounts) => {
        const active = (accounts || []).filter((a) => a.isActive);
        this.accountReady = active.length > 0;
        if (this.accountReady) {
          this.accountsService.resolveDefaultAccountId(active);
        }
      },
      error: () => {
        this.accountReady = false;
      }
    });

    this.loadCategories();

    this.loadCardsWhenAllowed();
  }

  submit(): void {
    if (this.loading) return;

    if (!this.focus) {
      this.uiFeedback.warning('Selecione seu objetivo inicial.');
      this.announce('Selecione um objetivo inicial para continuar.');
      this.step = 0;
      return;
    }

    if (!this.intelligenceMode) {
      this.uiFeedback.warning('Selecione o estilo inicial dos insights.');
      this.announce('Selecione o estilo inicial dos insights para continuar.');
      this.step = 1;
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.uiFeedback.warning('Revise os campos.');
      this.announce('Existem campos obrigatórios para revisar.');
      return;
    }

    this.loading = true;
    const payload = this.normalizePayload();
    this.profile.upsert(payload).subscribe({
      next: () => {
        this.loading = false;
        this.uiFeedback.success('Dados do perfil salvos. Vamos para a conta e os primeiros lançamentos.');
        this.announce('Dados e objetivo salvos com sucesso.');
        this.nextStep();
      },
      error: (err) => {
        if (err?.status === 401) {
          this.uiFeedback.error('Sessão expirada. Faça login novamente.');
          this.announce('Sessão expirada. Faça login novamente.');
          this.router.navigateByUrl('/login');
        } else {
          this.uiFeedback.error(extractApiErrorMessage(err, err instanceof Error ? err.message : 'Erro ao salvar dados.'));
          this.announce('Falha ao salvar os dados do perfil.');
        }
        this.loading = false;
      }
    });
  }

  nextStep(): void {
    if (this.step >= this.totalSteps - 1) {
      this.finishOnboarding();
      return;
    }
    this.step += 1;
    this.persistStep(false);
  }

  prevStep(): void {
    if (this.step <= 0) return;
    this.step -= 1;
    this.persistStep(false);
  }

  selectFocus(id: FocusArea): void {
    this.focus = id;
    this.saveDraft();
  }

  continueFromFocus(): void {
    if (!this.focus) {
      this.uiFeedback.warning('Selecione seu objetivo inicial.');
      this.announce('Selecione um objetivo inicial para continuar.');
      return;
    }
    this.saveDraft();
    this.nextStep();
  }

  continueFromPreferences(): void {
    if (!this.intelligenceMode) {
      this.uiFeedback.warning('Selecione o estilo inicial dos insights.');
      this.announce('Selecione o estilo inicial dos insights para continuar.');
      return;
    }
    this.uiFeedback.success('Preferências iniciais definidas. Vamos para seus dados básicos.');
    this.announce('Preferências iniciais definidas.');
    this.saveDraft();
    this.nextStep();
  }

  finishOnboarding(): void {
    if (this.savingEntries) return;
    if (!this.accountReady) {
      this.uiFeedback.warning('Crie uma conta para concluir o cadastro.');
      this.announce('Crie uma conta ativa para concluir o cadastro.');
      this.step = this.totalSteps - 1;
      return;
    }
    this.savingEntries = true;
    this.onboarding.updateStatus({ step: this.step, completed: true }).subscribe({
      next: () => {
        this.savingEntries = false;
        this.clearDraft();
        this.router.navigateByUrl('/dashboard');
      },
      error: (err) => {
        this.savingEntries = false;
        this.uiFeedback.error(extractApiErrorMessage(err, 'Falha ao concluir onboarding.'));
        this.announce('Falha ao concluir onboarding.');
      }
    });
  }

  skipOnboarding(): void {
    this.uiFeedback.warning('Para concluir, crie ao menos uma conta.');
    this.step = this.totalSteps - 1;
  }

  createAccount(): void {
    if (this.creatingAccount) return;
    if (!this.accountForm.name?.trim()) {
      this.uiFeedback.warning('Informe o nome da conta.');
      this.announce('Informe o nome da conta para continuar.');
      return;
    }

    this.creatingAccount = true;
    this.accountsService.create({
      name: this.accountForm.name.trim(),
      type: this.accountForm.type,
      initialBalance: Number(this.accountForm.initialBalance || 0),
      isActive: true,
      currency: 'BRL'
    }).subscribe({
      next: (account) => {
        this.creatingAccount = false;
        this.accountReady = true;
        this.accountsService.setDefaultAccountId(account.id);
        this.uiFeedback.success('Conta criada com sucesso. Próximo: cadastrar primeira receita e despesa.');
        this.announce('Conta criada com sucesso.');
      },
      error: (err) => {
        this.creatingAccount = false;
        this.uiFeedback.error(extractApiErrorMessage(err, 'Falha ao criar conta.'));
        this.announce('Falha ao criar conta.');
      }
    });
  }

  saveInitialEntriesAndFinish(): void {
    // Para concluir basta ter uma CONTA ativa. Cadastrar a primeira receita/despesa é
    // incentivado, mas opcional — não bloquear o usuário na entrada do app (#1).
    if (!this.accountReady) {
      this.showStep4Validation = true;
      this.uiFeedback.warning('Crie uma conta ativa para concluir.');
      this.announce('Crie uma conta ativa para concluir o onboarding.');
      this.step = this.totalSteps - 1;
      return;
    }
    this.showStep4Validation = false;
    this.finishOnboarding();
  }

  accountTypeLabel(type: AccountType): string {
    return accountTypeLabel(type);
  }

  hasError(control: 'fullName' | 'document' | 'phone' | 'birthDate' | 'city' | 'state' | 'country', type: string): boolean {
    const c = this.form.get(control);
    return !!c && c.touched && c.hasError(type);
  }

  onBirthDateChange(value: string): void {
    const control = this.form.get('birthDate');
    control?.setValue(value);
    control?.markAsTouched();
  }

  getControlError(control: 'fullName' | 'document' | 'phone' | 'birthDate' | 'city' | 'state' | 'country'): string | null {
    const c = this.form.get(control);
    if (!c || !c.touched || !c.errors) return null;

    if (c.errors['required']) {
      switch (control) {
        case 'fullName': return 'Informe seu nome.';
        case 'document': return 'Informe seu CPF.';
        case 'phone': return 'Informe seu telefone.';
        case 'birthDate': return 'Informe sua data de nascimento.';
        case 'city': return 'Informe sua cidade.';
        case 'state': return 'Informe seu estado.';
        case 'country': return 'Informe seu país.';
      }
    }

    if (c.errors['blank']) {
      switch (control) {
        case 'fullName': return 'Informe seu nome.';
        case 'city': return 'Informe sua cidade.';
        case 'state': return 'Informe seu estado.';
        case 'country': return 'Informe seu país.';
      }
    }

    if (c.errors['minlength']) {
      if (control === 'fullName') return 'Mínimo de 3 caracteres.';
      if (control === 'state') return 'Use 2 letras (UF).';
    }

    if (c.errors['maxlength'] && control === 'state') {
      return 'Use 2 letras (UF).';
    }

    if (c.errors['cpf']) return 'CPF inválido.';
    if (c.errors['phone']) return 'Use o formato (81) 99525-7823.';
    if (c.errors['birthDateRange']) return 'Informe uma data válida entre 01/01/1900 e hoje.';

    return 'Campo inválido.';
  }

  onCpfInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const masked = maskCpf(input.value);
    this.form.get('document')?.setValue(masked, { emitEvent: false });
  }

  onPhoneInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.form.get('phone')?.setValue(maskPhone(input.value), { emitEvent: false });
  }

  get hasInitialIncome(): boolean {
    return !!this.initialIncome.source && this.initialIncome.amount > 0 && !!this.initialIncome.receivedOn;
  }

  get hasInitialExpense(): boolean {
    return !!this.initialExpense.name && this.initialExpense.amount > 0 && !!this.initialExpense.dueDate;
  }

  get canFinishWithInitialEntries(): boolean {
    // Conta ativa é o único requisito para concluir; receita/despesa são opcionais (#1).
    return this.accountReady && !this.savingEntries;
  }

  get showStep4ValidationMessage(): boolean {
    return this.showStep4Validation && !this.accountReady;
  }

  get step4ValidationMessage(): string {
    return 'Crie sua conta principal para concluir o onboarding.';
  }

  get hasInitialCard(): boolean {
    return this.canUseCards && this.cardsCount > 0;
  }

  get canUseCards(): boolean {
    return this.uiPermissions.canReadCards();
  }

  get modalExpenseParcelValueLabel(): string {
    return this.modalExpenseAmountInput;
  }

  openIncomeModal(): void {
    if (!this.accountReady || this.savingIncomeModal) return;
    this.loadCategories('Income', true);
    this.modalIncome = createIncomeDraft();
    this.modalIncomeAmountInput = '';
    this.modalIncomeDateInput = isoToBr(todayIso());
    this.modalIncomeDateError = '';
    this.modalIncomeCategoryError = '';
    this.showIncomeModal = true;
  }

  closeIncomeModal(): void {
    if (this.savingIncomeModal) return;
    this.showIncomeModal = false;
  }

  onIncomeAmountChange(raw: string): void {
    this.modalIncomeAmountInput = maskMoneyInput(raw);
  }

  onIncomeDateChange(raw: string): void {
    this.modalIncomeDateInput = maskDateDDMMYYYY(raw);
    this.modalIncomeDateError =
      !this.modalIncomeDateInput || this.isValidBrDate(this.modalIncomeDateInput)
        ? ''
        : 'Data inválida. Use o formato DD/MM/AAAA.';
  }

  onIncomeSourceChange(value: string): void {
    this.modalIncome.fonte = value;
  }

  onIncomeFixaChange(value: boolean): void {
    this.modalIncome.fixa = value;
  }

  saveIncomeModal(): void {
    if (this.savingIncomeModal) return;
    const amount = parseLocalizedNumber(this.modalIncomeAmountInput);
    if (!this.modalIncome.fonte?.trim() || amount <= 0) {
      this.uiFeedback.warning('Preencha uma receita válida.');
      return;
    }
    if (!this.modalIncome.categoryId) {
      this.modalIncomeCategoryError = 'Selecione uma categoria.';
      return;
    }
    this.modalIncomeCategoryError = '';
    if (!this.modalIncomeDateInput || !this.isValidBrDate(this.modalIncomeDateInput)) {
      this.modalIncomeDateError = 'Data inválida. Use o formato DD/MM/AAAA.';
      return;
    }
    this.modalIncomeDateError = '';

    const payload: CreatePlanPayload = {
      type: 'Income',
      title: this.modalIncome.fonte.trim(),
      amount,
      schedule: this.modalIncome.fixa ? 'Recurring' : 'OneTime',
      startDate: brToIso(this.modalIncomeDateInput),
      frequency: this.modalIncome.fixa ? 'Monthly' : null,
      installmentsCount: this.modalIncome.fixa ? null : 1,
      categoryId: this.modalIncome.categoryId,
      cardId: null
    };

    this.savingIncomeModal = true;
    this.plansService.create(payload).subscribe({
      next: () => {
        this.savingIncomeModal = false;
        this.showIncomeModal = false;
        this.initialIncome = {
          source: this.modalIncome.fonte.trim(),
          amount,
          receivedOn: brToIso(this.modalIncomeDateInput)
        };
        this.uiFeedback.success('Receita inicial cadastrada.');
      },
      error: (err) => {
        this.savingIncomeModal = false;
        this.uiFeedback.error(extractApiErrorMessage(err, 'Falha ao cadastrar receita inicial.'));
      }
    });
  }

  openExpenseModal(): void {
    if (!this.accountReady || this.savingExpenseModal) return;
    this.loadCategories('Expense', true);
    this.modalExpense = createExpenseDraft();
    this.modalExpenseAmountInput = '';
    this.modalExpenseDateInput = isoToBr(todayIso());
    this.modalExpenseDateError = '';
    this.modalExpenseCategoryError = '';
    this.modalExpenseFormaPagamento = 'avista';
    this.modalExpenseParcelar = false;
    this.modalExpenseParcelas = 1;
    this.modalExpenseFixa = false;
    this.modalExpenseFixaMeses = null;
    this.modalExpenseCartaoId = null;
    this.showExpenseModal = true;
  }

  openCardsPage(): void {
    if (!this.canUseCards) return;
    this.router.navigateByUrl('/cartoes');
  }

  closeExpenseModal(): void {
    if (this.savingExpenseModal) return;
    this.showExpenseModal = false;
  }

  onExpenseAmountChange(raw: string): void {
    this.modalExpenseAmountInput = maskMoneyInput(raw);
  }

  onExpenseDateChange(raw: string): void {
    this.modalExpenseDateInput = maskDateDDMMYYYY(raw);
    this.modalExpenseDateError =
      !this.modalExpenseDateInput || this.isValidBrDate(this.modalExpenseDateInput)
        ? ''
        : 'Data inválida. Use o formato DD/MM/AAAA.';
  }

  onExpenseFormaPagamentoChange(value: 'avista' | 'cartao'): void {
    if (value === 'cartao' && !this.canUseCards) {
      this.modalExpenseFormaPagamento = 'avista';
      this.modalExpenseParcelar = false;
      this.modalExpenseParcelas = 1;
      this.modalExpenseCartaoId = null;
      return;
    }
    this.modalExpenseFormaPagamento = value;
    if (value !== 'cartao') {
      this.modalExpenseParcelar = false;
      this.modalExpenseParcelas = 1;
      this.modalExpenseCartaoId = null;
    }
  }

  onExpenseParcelarChange(value: boolean): void {
    this.modalExpenseParcelar = value;
    if (!value) this.modalExpenseParcelas = 1;
  }

  onExpenseParcelasChange(value: number): void {
    // Cartão: entre 1 e 36 parcelas (evita geração em massa / erro do backend). (#3)
    this.modalExpenseParcelas = Math.min(Math.max(Math.trunc(Number(value || 1)), 1), 36);
  }

  onExpenseFixaChange(value: boolean): void {
    this.modalExpenseFixa = value;
    if (value) {
      this.modalExpenseFormaPagamento = 'avista';
      this.modalExpenseParcelar = false;
      this.modalExpenseParcelas = 1;
      this.modalExpenseCartaoId = null;
    } else {
      this.modalExpenseFixaMeses = null;
    }
  }

  onExpenseFixaMesesChange(value: number | null): void {
    if (value === null || value === undefined || Number.isNaN(value)) {
      this.modalExpenseFixaMeses = null;
      return;
    }
    // Duração de despesa fixa: entre 1 e 120 meses. (#3)
    this.modalExpenseFixaMeses = Math.min(Math.max(Math.trunc(Number(value)), 1), 120);
  }

  saveExpenseModal(): void {
    if (this.savingExpenseModal) return;
    const amount = parseLocalizedNumber(this.modalExpenseAmountInput);
    if (!this.modalExpense.nome?.trim() || amount <= 0) {
      this.uiFeedback.warning('Preencha uma despesa válida.');
      return;
    }
    if (!this.modalExpense.categoryId) {
      this.modalExpenseCategoryError = 'Selecione uma categoria.';
      return;
    }
    this.modalExpenseCategoryError = '';
    if (!this.modalExpenseDateInput || !this.isValidBrDate(this.modalExpenseDateInput)) {
      this.modalExpenseDateError = 'Data inválida. Use o formato DD/MM/AAAA.';
      return;
    }
    this.modalExpenseDateError = '';

    let schedule: 'OneTime' | 'Installments' | 'Recurring' = 'OneTime';
    let installmentsCount: number | null = 1;
    let frequency: 'Monthly' | null = null;
    let launchAmount = amount;

    if (this.modalExpenseFixa) {
      if (this.modalExpenseFixaMeses && this.modalExpenseFixaMeses > 1) {
        schedule = 'Installments';
        installmentsCount = this.modalExpenseFixaMeses;
      } else {
        schedule = 'Recurring';
        installmentsCount = null;
        frequency = 'Monthly';
      }
    } else if (this.modalExpenseFormaPagamento === 'cartao' && this.modalExpenseParcelar && this.modalExpenseParcelas > 1) {
      schedule = 'Installments';
      installmentsCount = this.modalExpenseParcelas;
    }

    const payload: CreatePlanPayload = {
      type: 'Expense',
      title: this.modalExpense.nome.trim(),
      amount: launchAmount,
      schedule,
      startDate: brToIso(this.modalExpenseDateInput),
      frequency,
      installmentsCount,
      categoryId: this.modalExpense.categoryId,
      cardId: this.modalExpenseFormaPagamento === 'cartao' ? this.modalExpenseCartaoId : null
    };

    this.savingExpenseModal = true;
    this.plansService.create(payload).subscribe({
      next: () => {
        this.savingExpenseModal = false;
        this.showExpenseModal = false;
        this.initialExpense = {
          name: this.modalExpense.nome.trim(),
          amount,
          dueDate: brToIso(this.modalExpenseDateInput),
          categoryId: this.modalExpense.categoryId || null
        };
        this.uiFeedback.success('Despesa inicial cadastrada.');
      },
      error: (err) => {
        this.savingExpenseModal = false;
        this.uiFeedback.error(extractApiErrorMessage(err, 'Falha ao cadastrar despesa inicial.'));
      }
    });
  }

  private normalizePayload() {
    const raw = this.form.value;
    const formattedPhone = maskPhone(raw.phone as string) || raw.phone;
    const birthDateIso = raw.birthDate ? `${raw.birthDate}T00:00:00Z` : undefined;

    return {
      fullName: (raw.fullName as string).trim(),
      phone: formattedPhone,
      birthDate: birthDateIso,
      avatarUrl: '',
      city: (raw.city as string).trim(),
      state: (raw.state as string).trim().toUpperCase(),
      country: (raw.country as string).trim(),
      financialGoal: this.focus ?? '',
      language: 'pt-BR',
      carryOverDay: this.canEditCarryOverDay ? this.carryOverDay : 1,
      intelligenceMode: this.intelligenceMode as IntelligenceMode
    };
  }

  private loadCardsWhenAllowed(): void {
    if (!this.canUseCards) {
      this.cardsCount = 0;
      this.modalExpenseCartoes = [];
      return;
    }

    this.cardsService.list().subscribe({
      next: (cards) => {
        this.cardsCount = (cards || []).length;
        this.modalExpenseCartoes = (cards || []).map((card) => toStoredCard(card));
      },
      error: () => {
        this.cardsCount = 0;
        this.modalExpenseCartoes = [];
      }
    });
  }

  private loadCategories(type?: 'Income' | 'Expense', forceRefresh = false): void {
    if (forceRefresh) {
      this.categoriesService.invalidateCache();
    }

    if (!type || type === 'Expense') {
      this.categoriesService.list('Expense').subscribe({
        next: (categories) => {
          this.expenseCategories = categories || [];
        },
        error: () => {
          this.expenseCategories = [];
        }
      });
    }

    if (!type || type === 'Income') {
      this.categoriesService.list('Income').subscribe({
        next: (categories) => {
          this.incomeCategories = categories || [];
        },
        error: () => {
          this.incomeCategories = [];
        }
      });
    }
  }

  private phoneValidator(): ValidatorFn {
    return (control: AbstractControl) => {
      const digits = (control.value || '').toString().replace(/\D/g, '');
      if (!digits) return null;
      // Aceita fixo (10 dígitos) e celular (11 dígitos).
      return digits.length === 10 || digits.length === 11 ? null : { phone: true };
    };
  }

  private noBlankValidator(): ValidatorFn {
    return (control: AbstractControl) => {
      const value = (control.value ?? '').toString();
      if (!value) return null;
      return value.trim().length > 0 ? null : { blank: true };
    };
  }

  private birthDateRangeValidator(): ValidatorFn {
    return (control: AbstractControl) => {
      const value = (control.value ?? '').toString().trim();
      if (!value) return null;

      const date = new Date(`${value}T00:00:00`);
      if (Number.isNaN(date.getTime())) return { birthDateRange: true };

      const min = new Date(`${this.minBirthDate}T00:00:00`);
      const max = new Date(`${this.maxBirthDate}T00:00:00`);
      return date >= min && date <= max ? null : { birthDateRange: true };
    };
  }

  private persistStep(completed: boolean): void {
    this.onboarding.updateStatus({ step: this.step, completed }).subscribe({
      error: () => {
        /* ignore */
      }
    });
  }

  trackByIndex(index: number, _item?: unknown): number {
    return index;
  }

  isStepActive(stepIndex: number): boolean {
    return this.step === stepIndex;
  }

  isStepDone(stepIndex: number): boolean {
    return this.step > stepIndex;
  }

  get currentRole(): UserRole | null {
    return this.authService.getRole();
  }

  get canEditCarryOverDay(): boolean {
    return hasAtLeastRole(this.currentRole, 'Intermediate');
  }

  get showStep4ContextPanels(): boolean {
    return this.currentRole !== 'Basic';
  }

  private isValidBrDate(value: string): boolean {
    return !!parseLocaleDate(value);
  }

  private announce(message: string): void {
    this.liveMessage = '';
    setTimeout(() => {
      this.liveMessage = message;
    }, 0);
  }

  private loadProfile(prefillForm: boolean): void {
    this.profile.getProfile().subscribe({
      next: (data) => {
        if (!data) {
          if (prefillForm) this.prefillProfileFromSession();
          return;
        }

        const goals = new Set(this.focusOptions.map((x) => x.id));
        const savedGoal = (data as { financialGoal?: string }).financialGoal;
        if (savedGoal && goals.has(savedGoal as FocusArea)) {
          this.focus = savedGoal as FocusArea;
          this.saveDraft();
        }
        const savedMode = (data as { intelligenceMode?: string }).intelligenceMode?.toUpperCase();
        if (savedMode === 'B' || savedMode === 'C') {
          this.intelligenceMode = savedMode as IntelligenceMode;
          this.saveDraft();
        }
        const savedCarryOver = Number((data as { carryOverDay?: number }).carryOverDay);
        if (this.canEditCarryOverDay && Number.isInteger(savedCarryOver) && savedCarryOver >= 1 && savedCarryOver <= 31) {
          this.carryOverDay = savedCarryOver;
        } else if (!this.canEditCarryOverDay) {
          this.carryOverDay = 1;
        }

        this.hasDocument = !!data.document;
        if (this.hasDocument) {
          this.form.get('document')?.clearValidators();
          this.form.get('document')?.updateValueAndValidity();
        }

        if (!prefillForm) return;

        this.form.patchValue({
          fullName: data.fullName || this.authService.getUserName(),
          document: maskCpf(data.document),
          phone: maskPhone(data.phone),
          birthDate: data.birthDate ? data.birthDate.substring(0, 10) : '',
          city: data.city ?? '',
          state: data.state ?? '',
          country: data.country ?? ''
        });
      },
      error: (err) => {
        if (err.status === 401) {
          this.router.navigateByUrl('/login');
          return;
        }
        if (prefillForm) this.prefillProfileFromSession();
      }
    });
  }

  private prefillProfileFromSession(): void {
    const fullName = this.authService.getUserName().trim();
    if (!fullName || this.form.get('fullName')?.value) return;
    this.form.patchValue({ fullName });
  }

  private restoreDraft(): void {
    const draft = this.onboardingDraft.read();
    if (!draft) return;

    this.focus = draft.focus;
    this.intelligenceMode = draft.intelligenceMode;
    this.carryOverDay = draft.carryOverDay;
  }

  saveDraft(): void {
    this.onboardingDraft.save({
      focus: this.focus,
      intelligenceMode: this.intelligenceMode,
      carryOverDay: this.carryOverDay
    });
  }

  private clearDraft(): void {
    this.onboardingDraft.clear();
  }

}
