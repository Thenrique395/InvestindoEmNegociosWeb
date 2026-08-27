import { Component, DestroyRef, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { AbstractControl, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Meta, Title } from '@angular/platform-browser';
import { NgTemplateOutlet } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService, RegisterPayload } from '../auth.service';
import { UiFeedbackService } from '../ui-feedback.service';
import { cpfValidator, maskCpf } from '../utils/cpf.utils';
import { DEFAULT_META_DESCRIPTION, DEFAULT_TITLE } from '../seo-defaults';
import { AuthLayoutComponent } from '../auth-layout/auth-layout.component';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, NgTemplateOutlet, AuthLayoutComponent],
  templateUrl: './signup.component.html'
})
export class SignupComponent implements OnInit, OnDestroy {
  @Output() signedUp = new EventEmitter<void>();

  loading = false;
  showPassword = false;
  showConfirmPassword = false;

  form: FormGroup<{
    nome: FormControl<string>;
    email: FormControl<string>;
    cpf: FormControl<string>;
    senha: FormControl<string>;
    confirmarSenha: FormControl<string>;
    aceitarTermos: FormControl<boolean>;
  }>;

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router,
    private uiFeedback: UiFeedbackService,
    private title: Title,
    private meta: Meta,
    private readonly destroyRef: DestroyRef
  ) {
    this.form = this.fb.nonNullable.group(
      {
        nome: ['', [Validators.required, Validators.minLength(2)]],
        email: ['', [Validators.required, Validators.email]],
        cpf: ['', [Validators.required, cpfValidator()]],
        senha: ['', [Validators.required, Validators.minLength(6)]],
        confirmarSenha: ['', [Validators.required]],
        aceitarTermos: [false, Validators.requiredTrue]
      },
      { validators: this.passwordsMatchValidator }
    );
  }

  get isRoutePage(): boolean {
    return this.router.url.split('?')[0].startsWith('/register');
  }

  ngOnInit(): void {
    if (!this.isRoutePage) return;

    this.title.setTitle('Criar conta grátis — Investindo em Negócios');
    this.meta.updateTag({
      name: 'description',
      content: 'Crie sua conta grátis e monte seu primeiro painel financeiro em minutos, sem cartão de crédito.'
    });
  }

  ngOnDestroy(): void {
    if (!this.isRoutePage) return;

    this.title.setTitle(DEFAULT_TITLE);
    this.meta.updateTag({ name: 'description', content: DEFAULT_META_DESCRIPTION });
  }

  /**
   * Força da senha em 3 níveis, para o medidor de barras.
   * 1 = só comprimento · 2 = letras e números · 3 = + maiúscula ou símbolo.
   */
  get passwordStrength(): number {
    const value: string = this.form.get('senha')?.value ?? '';
    if (value.length < 6) return value.length > 0 ? 1 : 0;

    const hasLetter = /[a-zA-Z]/.test(value);
    const hasNumber = /\d/.test(value);
    const hasStrong = /[A-Z]/.test(value) || /[^a-zA-Z0-9]/.test(value);

    if (hasLetter && hasNumber && hasStrong && value.length >= 8) return 3;
    if (hasLetter && hasNumber) return 2;
    return 1;
  }

  onSubmit(): void {
    if (this.loading) return;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.uiFeedback.warning('Revise os campos destacados.');
      return;
    }

    this.loading = true;
    const { nome, email, senha, cpf } = this.form.getRawValue();
    const payload: RegisterPayload = { nome, email, senha, cpf };

    this.auth.register(payload).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.loading = false;
        this.signedUp.emit();
        if (this.isRoutePage) {
          this.router.navigate(['/login'], { queryParams: { created: '1', confirm: '1' } });
          return;
        }
        this.uiFeedback.success('Conta criada! Enviamos um e-mail de confirmação — confirme para poder entrar.');
      },
      error: (err: unknown) => {
        const code = err && typeof err === 'object' && 'code' in err ? (err as { code?: string }).code : undefined;
        if (code === 'emailInUse') {
          this.form.get('email')?.setErrors({ emailInUse: true });
        }
        if (code === 'documentInUse') {
          this.form.get('cpf')?.setErrors({ documentInUse: true });
        }
        this.uiFeedback.error(this.getSignupErrorMessage(err));
        this.loading = false;
      }
    });
  }

  onCpfInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.form.get('cpf')?.setValue(maskCpf(input.value), { emitEvent: false });
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  hasControlError(control: 'nome' | 'email' | 'cpf' | 'senha' | 'confirmarSenha' | 'aceitarTermos'): boolean {
    const ctrl = this.form.get(control);
    return !!ctrl && ctrl.touched && ctrl.invalid;
  }

  hasError(control: 'nome' | 'email' | 'cpf' | 'senha' | 'confirmarSenha' | 'aceitarTermos', type: string): boolean {
    const ctrl = this.form.get(control);
    return !!ctrl && ctrl.touched && ctrl.hasError(type);
  }

  hasPasswordMismatch(): boolean {
    const confirm = this.form.get('confirmarSenha');
    return !!confirm && confirm.touched && this.form.hasError('passwordMismatch');
  }

  private passwordsMatchValidator(control: AbstractControl): Record<string, boolean> | null {
    const password = control.get('senha')?.value;
    const confirmPassword = control.get('confirmarSenha')?.value;

    if (!password || !confirmPassword) {
      return null;
    }

    return password === confirmPassword ? null : { passwordMismatch: true };
  }

  private getSignupErrorMessage(err: unknown): string {
    const error = err as Error & { code?: string; status?: number };

    if (error?.code === 'emailInUse') {
      return 'Este e-mail já está em uso. Use outro e-mail ou entre na sua conta.';
    }

    if (error?.code === 'documentInUse') {
      return 'Este CPF já está em uso. Verifique os dados ou entre na sua conta.';
    }

    if (error?.status && error.status >= 500) {
      return 'Não foi possível criar a conta agora. Tente novamente em alguns minutos.';
    }

    return err instanceof Error && err.message
      ? err.message
      : 'Não foi possível criar a conta. Revise os dados e tente novamente.';
  }
}
