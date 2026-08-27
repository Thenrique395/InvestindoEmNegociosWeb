import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, DestroyRef, OnDestroy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DEFAULT_META_DESCRIPTION, DEFAULT_TITLE } from '../seo-defaults';
import { AuthService, RegisterPayload } from '../auth.service';
import { BillingService } from '../billing.service';
import { CheckoutIntentService } from '../checkout-intent.service';
import { MARKETING_PLANS, findMarketingPlan, MarketingBillingCycle, MarketingPlan } from '../marketing-plans';
import { SubscriptionsService } from '../subscriptions.service';
import { UiFeedbackService } from '../ui-feedback.service';
import { cpfValidator, maskCpf } from '../utils/cpf.utils';
import { extractApiErrorMessage } from '../utils/api-error.utils';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, RouterLink, CurrencyPipe, ReactiveFormsModule],
  templateUrl: './checkout.component.html',
  styleUrl: './checkout.component.scss'
})
export class CheckoutComponent implements OnDestroy {
  plans = MARKETING_PLANS;
  selectedPlan: MarketingPlan = findMarketingPlan(null);
  selectedCycle: MarketingBillingCycle = 'Monthly';
  processing = false;
  currentStep = 1;

  accountForm: FormGroup<{
    nome: FormControl<string>;
    email: FormControl<string>;
    cpf: FormControl<string>;
    senha: FormControl<string>;
    confirmarSenha: FormControl<string>;
    aceitarTermos: FormControl<boolean>;
  }>;
  checkingAvailability = false;
  accountExists = false;
  showRegistrationFields = false;
  showPassword = false;
  showConfirmPassword = false;

  readonly planIconVariants: Record<string, string> = {
    basic: 'plan-option__icon--info',
    intermediate: 'plan-option__icon--primary',
    advanced: 'plan-option__icon--success'
  };

  constructor(
    route: ActivatedRoute,
    private readonly router: Router,
    private readonly authService: AuthService,
    private readonly billingService: BillingService,
    private readonly checkoutIntent: CheckoutIntentService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly uiFeedback: UiFeedbackService,
    private readonly fb: FormBuilder,
    private readonly title: Title,
    private readonly meta: Meta,
    private readonly destroyRef: DestroyRef
  ) {
    route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.selectedPlan = findMarketingPlan(params.get('plan'));
      this.selectedCycle = params.get('cycle') === 'Yearly' ? 'Yearly' : 'Monthly';
      this.persistIntent();
    });

    this.accountForm = this.fb.nonNullable.group(
      {
        nome: ['', [Validators.required, Validators.minLength(2)]],
        email: ['', [Validators.required, Validators.email]],
        cpf: ['', [Validators.required, cpfValidator()]],
        senha: [''],
        confirmarSenha: [''],
        aceitarTermos: [false]
      },
      { validators: this.passwordsMatchValidator }
    );

    this.title.setTitle('Finalizar assinatura — Investindo em Negócios');
    this.meta.updateTag({
      name: 'description',
      content: 'Finalize sua assinatura em poucos passos, em ambiente seguro processado pela Stripe.'
    });
    this.meta.updateTag({ name: 'robots', content: 'noindex, nofollow' });
  }

  ngOnDestroy(): void {
    this.title.setTitle(DEFAULT_TITLE);
    this.meta.updateTag({ name: 'description', content: DEFAULT_META_DESCRIPTION });
    this.meta.removeTag("name='robots'");
  }

  get selectedPrice(): number {
    return this.selectedCycle === 'Yearly'
      ? this.selectedPlan.yearlyPrice
      : this.selectedPlan.monthlyPrice;
  }

  get isLogged(): boolean {
    return this.authService.isAuthenticated();
  }

  get userName(): string {
    return this.authService.getUserName();
  }

  get userEmail(): string {
    return this.authService.getUserEmail();
  }

  get userInitial(): string {
    return this.userName.trim().charAt(0).toUpperCase() || '?';
  }

  get currentPlan(): MarketingPlan | null {
    const role = this.authService.getRole();
    if (!role || role === 'Admin') return null;
    return findMarketingPlan(role.toLowerCase());
  }

  get confirmationStepNumber(): number {
    return this.selectedPlan.code === 'basic' ? 3 : 4;
  }

  get paymentStepNumber(): number | null {
    return this.selectedPlan.code === 'basic' ? null : 3;
  }

  get stepperItems(): { step: number; label: string }[] {
    const items: { step: number; label: string }[] = [
      { step: 1, label: 'Plano' },
      { step: 2, label: 'Sua conta' }
    ];
    if (this.paymentStepNumber) {
      items.push({ step: this.paymentStepNumber, label: 'Pagamento' });
    }
    items.push({
      step: this.confirmationStepNumber,
      label: this.selectedPlan.code === 'basic' ? 'Ativação' : 'Confirmação'
    });
    return items;
  }

  goToStep(step: number): void {
    this.currentStep = step;
  }

  continueFromPlan(): void {
    this.currentStep = 2;
  }

  continueFromAccount(): void {
    this.currentStep = this.paymentStepNumber ?? this.confirmationStepNumber;
  }

  continueFromPayment(): void {
    this.currentStep = this.confirmationStepNumber;
  }

  selectPlan(planCode: string): void {
    const plan = findMarketingPlan(planCode);
    this.router.navigate([], {
      queryParams: { plan: plan.code, cycle: this.selectedCycle },
      queryParamsHandling: 'merge'
    });
  }

  selectCycle(cycle: MarketingBillingCycle): void {
    this.router.navigate([], {
      queryParams: { plan: this.selectedPlan.code, cycle },
      queryParamsHandling: 'merge'
    });
  }

  continueToLogin(): void {
    this.persistIntent();
    this.router.navigate(['/login'], {
      queryParams: {
        returnTo: '/checkout',
        plan: this.selectedPlan.code,
        cycle: this.selectedCycle
      }
    });
  }

  activatePlan(): void {
    if (this.processing) return;

    if (!this.isLogged) {
      this.continueToLogin();
      return;
    }

    this.processing = true;
    if (this.selectedPlan.code !== 'basic') {
      this.billingService.startCheckout(this.selectedPlan.code, this.selectedCycle).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: (response) => {
          this.checkoutIntent.save({
            plan: this.selectedPlan.code,
            cycle: this.selectedCycle
          });
          if (response.checkoutUrl) {
            window.location.href = response.checkoutUrl;
            return;
          }
          this.router.navigate(['/checkout/pendente'], {
            queryParams: { checkout_id: response.checkoutId }
          });
        },
        error: (err) => {
          this.router.navigate(['/checkout/falha'], {
            queryParams: {
              plan: this.selectedPlan.code,
              cycle: this.selectedCycle,
              message: extractApiErrorMessage(err, 'Não foi possível iniciar o checkout de cobrança.')
            }
          });
        },
        complete: () => {
          this.processing = false;
        }
      });
      return;
    }

    this.subscriptionsService.change(this.selectedPlan.code, this.selectedCycle).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        this.authService.applySession(response.session);
        this.checkoutIntent.clear();
        this.uiFeedback.success(`Plano ${response.current.planName} ativado com sucesso.`);
        this.router.navigate(['/checkout/sucesso'], {
          queryParams: { plan: this.selectedPlan.code, cycle: this.selectedCycle }
        });
      },
      error: (err) => {
        this.router.navigate(['/checkout/falha'], {
          queryParams: {
            plan: this.selectedPlan.code,
            cycle: this.selectedCycle,
            message: extractApiErrorMessage(err, 'Não foi possível concluir a contratação neste momento.')
          }
        });
      },
      complete: () => {
        this.processing = false;
      }
    });
  }

  onAccountStepSubmit(): void {
    if (this.showRegistrationFields) {
      this.submitRegistration();
    } else {
      this.checkAccount();
    }
  }

  checkAccount(): void {
    if (this.checkingAvailability) return;

    const nome = this.accountForm.get('nome');
    const email = this.accountForm.get('email');
    const cpf = this.accountForm.get('cpf');
    nome?.markAsTouched();
    email?.markAsTouched();
    cpf?.markAsTouched();

    if (nome?.invalid || email?.invalid || cpf?.invalid) {
      this.uiFeedback.warning('Revise os campos destacados.');
      return;
    }

    this.checkingAvailability = true;
    this.authService.checkAvailability(email?.value, cpf?.value).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (res) => {
        this.checkingAvailability = false;
        if (res.emailExists || res.documentExists) {
          this.accountExists = true;
          this.showRegistrationFields = false;
          if (res.emailExists) email?.setErrors({ emailInUse: true });
          if (res.documentExists) cpf?.setErrors({ documentInUse: true });
        } else {
          this.accountExists = false;
          this.revealRegistrationFields();
        }
      },
      error: () => {
        this.checkingAvailability = false;
        this.uiFeedback.error('Não foi possível verificar seus dados. Tente novamente.');
      }
    });
  }

  submitRegistration(): void {
    if (this.processing) return;

    this.accountForm.markAllAsTouched();
    if (this.accountForm.invalid) {
      this.uiFeedback.warning('Revise os campos destacados.');
      return;
    }

    this.processing = true;
    this.persistIntent();
    const { nome, email, senha, cpf } = this.accountForm.getRawValue();
    const payload: RegisterPayload = { nome, email, senha, cpf };

    this.authService.register(payload).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        // Double opt-in: o cadastro não loga mais. O usuário precisa confirmar o e-mail antes de
        // seguir (o fluxo de pagamento está adiado de qualquer forma).
        this.processing = false;
        this.uiFeedback.success('Conta criada! Enviamos um e-mail de confirmação — confirme para poder entrar.');
      },
      error: (err: unknown) => {
        this.processing = false;
        const code = err && typeof err === 'object' && 'code' in err ? (err as { code?: string }).code : undefined;
        if (code === 'emailInUse') {
          this.accountForm.get('email')?.setErrors({ emailInUse: true });
        }
        if (code === 'documentInUse') {
          this.accountForm.get('cpf')?.setErrors({ documentInUse: true });
        }
        const message = err instanceof Error && err.message ? err.message : 'Não foi possível criar a conta.';
        this.uiFeedback.error(message);
      }
    });
  }

  onAccountCpfInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.accountForm.get('cpf')?.setValue(maskCpf(input.value), { emitEvent: false });
    this.resetAccountCheck();
  }

  resetAccountCheck(): void {
    if (!this.accountExists && !this.showRegistrationFields) return;

    this.accountExists = false;
    this.showRegistrationFields = false;
    const senha = this.accountForm.get('senha');
    const confirmarSenha = this.accountForm.get('confirmarSenha');
    const aceitarTermos = this.accountForm.get('aceitarTermos');
    senha?.clearValidators();
    confirmarSenha?.clearValidators();
    aceitarTermos?.clearValidators();
    senha?.updateValueAndValidity();
    confirmarSenha?.updateValueAndValidity();
    aceitarTermos?.updateValueAndValidity();
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  hasAccountError(control: string): boolean {
    const ctrl = this.accountForm.get(control);
    return !!ctrl && ctrl.touched && ctrl.invalid;
  }

  hasAccountFieldError(control: string, type: string): boolean {
    const ctrl = this.accountForm.get(control);
    return !!ctrl && ctrl.touched && ctrl.hasError(type);
  }

  hasAccountPasswordMismatch(): boolean {
    const confirm = this.accountForm.get('confirmarSenha');
    return !!confirm && confirm.touched && this.accountForm.hasError('passwordMismatch');
  }

  private revealRegistrationFields(): void {
    this.showRegistrationFields = true;
    const senha = this.accountForm.get('senha');
    const confirmarSenha = this.accountForm.get('confirmarSenha');
    const aceitarTermos = this.accountForm.get('aceitarTermos');
    senha?.setValidators([Validators.required, Validators.minLength(6)]);
    confirmarSenha?.setValidators([Validators.required]);
    aceitarTermos?.setValidators([Validators.requiredTrue]);
    senha?.updateValueAndValidity();
    confirmarSenha?.updateValueAndValidity();
    aceitarTermos?.updateValueAndValidity();
  }

  private passwordsMatchValidator(control: AbstractControl): Record<string, boolean> | null {
    const password = control.get('senha')?.value;
    const confirmPassword = control.get('confirmarSenha')?.value;

    if (!password || !confirmPassword) {
      return null;
    }

    return password === confirmPassword ? null : { passwordMismatch: true };
  }

  private persistIntent(): void {
    this.checkoutIntent.save({
      plan: this.selectedPlan.code,
      cycle: this.selectedCycle
    });
  }
}
