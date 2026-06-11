import { Component, EventEmitter, Output } from '@angular/core';

import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService, RegisterPayload } from '../auth.service';
import { UiFeedbackService } from '../ui-feedback.service';
import { cpfValidator, maskCpf } from '../utils/cpf.utils';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.scss']
})
export class SignupComponent {
  @Output() signedUp = new EventEmitter<void>();

  loading = false;
  showPassword = false;
  showConfirmPassword = false;

  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router,
    private uiFeedback: UiFeedbackService
  ) {
    this.form = this.fb.group(
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

  onSubmit(): void {
    if (this.loading) return;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.uiFeedback.warning('Revise os campos destacados.');
      return;
    }

    this.loading = true;
    const payload = this.form.value as RegisterPayload;

    this.auth.register(payload).subscribe({
      next: () => {
        this.loading = false;
        this.signedUp.emit();
        if (this.isRoutePage) {
          this.router.navigate(['/login'], { queryParams: { created: '1' } });
          return;
        }
        this.uiFeedback.success('Conta criada com sucesso. Faça login para entrar.');
      },
      error: (err: unknown) => {
        // eslint-disable-next-line no-console
        console.error('Signup error', err);
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
