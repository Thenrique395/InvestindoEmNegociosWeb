import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, ValidatorFn, AbstractControl, FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ProfileService } from '../profile.service';
import { OnboardingService } from '../onboarding.service';
import { FocusArea } from './onboarding.types';
import { UiFeedbackService } from '../ui-feedback.service';
import { AccountRequest, AccountType, AccountsService } from '../accounts.service';
import { CreatePlanPayload, PlansService } from '../plans.service';
import { CategoriesService, CategoryDto } from '../categories.service';
import { StoredCard, StoredExpense, StoredIncome } from '../data/api-data.service';
import { ReceitasFormComponent } from '../receitas/receitas-form.component';
import { DespesasFormComponent } from '../despesas/despesas-form.component';
import { maskDateDDMMYYYY, maskMoneyInput } from '../utils/input-mask';
import { parseLocaleDate, parseLocalizedNumber } from '../utils/locale-utils';

@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, ReceitasFormComponent, DespesasFormComponent],
  templateUrl: './onboarding.component.html',
  styleUrls: ['./onboarding.component.scss']
})
export class OnboardingComponent implements OnInit {
  form: FormGroup;
  loading = false;
  creatingAccount = false;
  savingEntries = false;
  liveMessage = '';
  readonly minBirthDate = '1900-01-01';
  readonly maxBirthDate = this.todayIso();
  step = 0;
  focus: FocusArea | null = null;
  focusOptions: { id: FocusArea; title: string; description: string; tooltip: string; icon: 'growth' | 'debt' | 'invest' | 'shield' }[] = [
    {
      id: 'vida-financeira',
      title: 'Melhorar vida financeira',
      description: 'Criar rotina para gastar melhor e ter mais controle no mês.',
      tooltip: 'Você vai priorizar organização geral: entradas, saídas e previsibilidade do mês.',
      icon: 'growth'
    },
    {
      id: 'sair-dividas',
      title: 'Sair das dívidas',
      description: 'Priorizar pagamentos e reduzir pressão financeira.',
      tooltip: 'Foco em reduzir dívidas atuais, controlar juros e acompanhar progresso de quitação.',
      icon: 'debt'
    },
    {
      id: 'comecar-investir',
      title: 'Começar a investir',
      description: 'Organizar sobra mensal para iniciar aportes com consistência.',
      tooltip: 'Objetivo voltado para criar sobra recorrente e transformar em aportes mensais.',
      icon: 'invest'
    },
    {
      id: 'reserva-emergencia',
      title: 'Criar reserva de emergência',
      description: 'Montar segurança para imprevistos antes de assumir mais risco.',
      tooltip: 'Prioridade em construir proteção financeira para imprevistos sem depender de crédito.',
      icon: 'shield'
    }
  ];
  accountReady = false;
  accountForm: AccountRequest = {
    name: '',
    type: 'Checking',
    initialBalance: 0,
    isActive: true
  };
  accountTypes: AccountType[] = ['Checking', 'Savings', 'DigitalWallet', 'Cash', 'Other'];
  expenseCategories: CategoryDto[] = [];
  incomeCategories: CategoryDto[] = [];
  showIncomeModal = false;
  showExpenseModal = false;
  savingIncomeModal = false;
  savingExpenseModal = false;
  modalIncome: StoredIncome = this.createIncomeDraft();
  modalIncomeAmountInput = '';
  modalIncomeDateInput = '';
  modalIncomeDateError = '';
  modalIncomeCategoryError = '';
  modalExpense: StoredExpense = this.createExpenseDraft();
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
  readonly modalExpenseCartoes: StoredCard[] = [];
  initialIncome = { source: '', amount: 0, receivedOn: '' };
  initialExpense = { name: '', amount: 0, dueDate: '', categoryId: null as string | null };

  constructor(
    private fb: FormBuilder,
    private profile: ProfileService,
    private router: Router,
    private onboarding: OnboardingService,
    private uiFeedback: UiFeedbackService,
    private accountsService: AccountsService,
    private plansService: PlansService,
    private categoriesService: CategoriesService
  ) {
    this.form = this.fb.group({
      fullName: ['', [Validators.required, Validators.minLength(3), this.noBlankValidator()]],
      document: ['', [Validators.required, this.cpfValidator()]],
      phone: ['', [Validators.required, this.phoneValidator()]],
      birthDate: ['', [Validators.required, this.birthDateRangeValidator()]],
      city: ['', [Validators.required, this.noBlankValidator()]],
      state: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(2), this.noBlankValidator()]],
      country: ['', [Validators.required, this.noBlankValidator()]]
    });

    this.profile.getProfile().subscribe({
      next: (data) => {
        if (data) {
          const goals = new Set(this.focusOptions.map((x) => x.id));
          const savedGoal = (data as { financialGoal?: string }).financialGoal;
          if (savedGoal && goals.has(savedGoal as FocusArea)) {
            this.focus = savedGoal as FocusArea;
          }

          this.form.patchValue({
            fullName: data.fullName,
            document: this.maskCpf(data.document),
            phone: this.maskPhone(data.phone),
            birthDate: data.birthDate ? data.birthDate.substring(0, 10) : '',
            city: data.city ?? '',
            state: data.state ?? '',
            country: data.country ?? ''
          });
        }
      },
      error: (err) => {
        if (err.status === 401) {
          this.router.navigateByUrl('/login');
        }
      }
    });
  }

  ngOnInit(): void {
    this.onboarding.getStatus().subscribe({
      next: (status) => {
        if (status.completed) {
          this.router.navigateByUrl('/dashboard');
          return;
        }
        this.step = Math.min(Math.max(status.step || 0, 0), 2);
      },
      error: () => {
        /* ignore */
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

    this.categoriesService.list('Expense').subscribe({
      next: (categories) => {
        this.expenseCategories = categories || [];
      },
      error: () => {
        this.expenseCategories = [];
      }
    });
    this.categoriesService.list('Income').subscribe({
      next: (categories) => {
        this.incomeCategories = categories || [];
      },
      error: () => {
        this.incomeCategories = [];
      }
    });
  }

  submit(): void {
    if (this.loading) return;

    if (!this.focus) {
      this.uiFeedback.warning('Selecione seu objetivo inicial.');
      this.announce('Selecione um objetivo inicial para continuar.');
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
        this.uiFeedback.success('Dados e objetivo salvos. Vamos para o próximo passo.');
        this.announce('Dados e objetivo salvos com sucesso.');
        this.nextStep();
      },
      error: (err) => {
        if (err?.status === 401) {
          this.uiFeedback.error('Sessão expirada. Faça login novamente.');
          this.announce('Sessão expirada. Faça login novamente.');
          this.router.navigateByUrl('/login');
        } else {
          this.uiFeedback.error(err instanceof Error ? err.message : 'Erro ao salvar dados.');
          this.announce('Falha ao salvar os dados do perfil.');
        }
        this.loading = false;
      }
    });
  }

  nextStep(): void {
    if (this.step >= 2) {
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
  }

  continueFromFocus(): void {
    this.nextStep();
  }

  finishOnboarding(): void {
    if (!this.accountReady) {
      this.uiFeedback.warning('Crie uma conta para concluir o cadastro.');
      this.announce('Crie uma conta ativa para concluir o cadastro.');
      this.step = 1;
      return;
    }
    this.persistStep(true);
    this.router.navigateByUrl('/dashboard');
  }

  skipOnboarding(): void {
    this.uiFeedback.warning('Para concluir, crie ao menos uma conta.');
    this.step = 1;
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
      isActive: true
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
        this.uiFeedback.error(err?.error?.detail || 'Falha ao criar conta.');
        this.announce('Falha ao criar conta.');
      }
    });
  }

  saveInitialEntriesAndFinish(): void {
    if (!this.accountReady) {
      this.uiFeedback.warning('Crie uma conta antes de cadastrar receita e despesa.');
      this.announce('Crie uma conta antes de cadastrar receita e despesa.');
      this.step = 1;
      return;
    }
    if (!this.hasInitialIncome || !this.hasInitialExpense) {
      this.uiFeedback.warning('Cadastre uma receita e uma despesa para concluir.');
      this.announce('Cadastre uma receita e uma despesa para concluir o onboarding.');
      return;
    }
    this.finishOnboarding();
  }

  accountTypeLabel(type: AccountType): string {
    switch (type) {
      case 'Checking': return 'Conta corrente';
      case 'Savings': return 'Poupança';
      case 'DigitalWallet': return 'Carteira digital';
      case 'Cash': return 'Dinheiro';
      default: return 'Outro';
    }
  }

  hasError(control: 'fullName' | 'document' | 'phone' | 'birthDate' | 'city' | 'state' | 'country', type: string): boolean {
    const c = this.form.get(control);
    return !!c && c.touched && c.hasError(type);
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
    const digits = (input.value || '').replace(/\D/g, '').slice(0, 11);
    const masked = digits
      .replace(/^(\d{3})(\d)/, '$1.$2')
      .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4');

    this.form.get('document')?.setValue(masked, { emitEvent: false });
  }

  onPhoneInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const digits = (input.value || '').replace(/\D/g, '').slice(0, 11);
    let masked = digits;

    if (digits.length > 0) {
      masked = `(${digits.slice(0, Math.min(2, digits.length))}`;
    }
    if (digits.length >= 3) {
      masked = `(${digits.slice(0, 2)}) ${digits.slice(2, Math.min(7, digits.length))}`;
    }
    if (digits.length >= 8) {
      masked = `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
    }

    this.form.get('phone')?.setValue(masked, { emitEvent: false });
  }

  get hasInitialIncome(): boolean {
    return !!this.initialIncome.source && this.initialIncome.amount > 0 && !!this.initialIncome.receivedOn;
  }

  get hasInitialExpense(): boolean {
    return !!this.initialExpense.name && this.initialExpense.amount > 0 && !!this.initialExpense.dueDate;
  }

  get canFinishWithInitialEntries(): boolean {
    return this.accountReady && this.hasInitialIncome && this.hasInitialExpense && !this.savingEntries;
  }

  get modalExpenseParcelValueLabel(): string {
    return this.modalExpenseAmountInput;
  }

  openIncomeModal(): void {
    if (!this.accountReady || this.savingIncomeModal) return;
    this.modalIncome = this.createIncomeDraft();
    this.modalIncomeAmountInput = '';
    this.modalIncomeDateInput = this.isoToBr(this.todayIso());
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
      startDate: this.brToIso(this.modalIncomeDateInput),
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
          receivedOn: this.brToIso(this.modalIncomeDateInput)
        };
        this.uiFeedback.success('Receita inicial cadastrada.');
      },
      error: (err) => {
        this.savingIncomeModal = false;
        this.uiFeedback.error(err?.error?.detail || 'Falha ao cadastrar receita inicial.');
      }
    });
  }

  openExpenseModal(): void {
    if (!this.accountReady || this.savingExpenseModal) return;
    this.modalExpense = this.createExpenseDraft();
    this.modalExpenseAmountInput = '';
    this.modalExpenseDateInput = this.isoToBr(this.todayIso());
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
    this.modalExpenseParcelas = Math.max(1, Number(value || 1));
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
    this.modalExpenseFixaMeses = Number(value);
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
      startDate: this.brToIso(this.modalExpenseDateInput),
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
          dueDate: this.brToIso(this.modalExpenseDateInput),
          categoryId: this.modalExpense.categoryId || null
        };
        this.uiFeedback.success('Despesa inicial cadastrada.');
      },
      error: (err) => {
        this.savingExpenseModal = false;
        this.uiFeedback.error(err?.error?.detail || 'Falha ao cadastrar despesa inicial.');
      }
    });
  }

  private normalizePayload() {
    const raw = this.form.value;
    const docDigits = (raw.document as string).replace(/\D/g, '').slice(0, 11);
    const phoneDigits = (raw.phone as string).replace(/\D/g, '').slice(0, 11);
    const formattedPhone =
      phoneDigits.length === 11
        ? `(${phoneDigits.slice(0, 2)}) ${phoneDigits.slice(2, 7)}-${phoneDigits.slice(7, 11)}`
        : raw.phone;
    const birthDateIso = raw.birthDate ? `${raw.birthDate}T00:00:00Z` : undefined;

    return {
      fullName: (raw.fullName as string).trim(),
      document: docDigits,
      phone: formattedPhone,
      birthDate: birthDateIso,
      avatarUrl: '',
      city: (raw.city as string).trim(),
      state: (raw.state as string).trim().toUpperCase(),
      country: (raw.country as string).trim(),
      financialGoal: this.focus ?? '',
      language: 'pt-BR'
    };
  }

  private cpfValidator(): ValidatorFn {
    return (control: AbstractControl) => {
      const digits = (control.value || '').toString().replace(/\D/g, '');
      if (!digits) return null;
      if (digits.length !== 11) return { cpf: true };
      if (/^(\d)\1{10}$/.test(digits)) return { cpf: true };

      const firstVerifier = this.calculateCpfVerifier(digits.slice(0, 9), 10);
      const secondVerifier = this.calculateCpfVerifier(digits.slice(0, 10), 11);

      const isValid =
        Number(digits[9]) === firstVerifier &&
        Number(digits[10]) === secondVerifier;

      return isValid ? null : { cpf: true };
    };
  }

  private calculateCpfVerifier(base: string, startWeight: number): number {
    const sum = base
      .split('')
      .reduce((acc, digit, index) => acc + Number(digit) * (startWeight - index), 0);
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  }

  private phoneValidator(): ValidatorFn {
    return (control: AbstractControl) => {
      const digits = (control.value || '').toString().replace(/\D/g, '');
      if (!digits) return null;
      return digits.length === 11 ? null : { phone: true };
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

  private maskCpf(value: string): string {
    const digits = (value || '').replace(/\D/g, '').slice(0, 11);
    return digits
      .replace(/^(\d{3})(\d)/, '$1.$2')
      .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4');
  }

  private maskPhone(value: string): string {
    const digits = (value || '').replace(/\D/g, '').slice(0, 11);
    if (!digits) return '';
    if (digits.length <= 2) return `(${digits}`;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  trackByIndex(index: number): number {
    return index;
  }

  private todayIso(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private createIncomeDraft(): StoredIncome {
    return {
      id: '',
      fonte: '',
      categoria: '',
      categoryId: null,
      valor: 0,
      recebimento: '',
      fixa: false
    };
  }

  private createExpenseDraft(): StoredExpense {
    return {
      id: '',
      nome: '',
      categoria: '',
      categoryId: null,
      valor: 0,
      vencimento: ''
    };
  }

  private isValidBrDate(value: string): boolean {
    return !!parseLocaleDate(value);
  }

  private brToIso(value: string): string {
    const [dd, mm, yyyy] = value.split('/');
    if (!dd || !mm || !yyyy) return this.todayIso();
    return `${yyyy}-${mm}-${dd}`;
  }

  private isoToBr(value: string): string {
    const [yyyy, mm, dd] = (value || '').split('-');
    if (!yyyy || !mm || !dd) return '';
    return `${dd}/${mm}/${yyyy}`;
  }

  private announce(message: string): void {
    this.liveMessage = '';
    setTimeout(() => {
      this.liveMessage = message;
    }, 0);
  }

}
