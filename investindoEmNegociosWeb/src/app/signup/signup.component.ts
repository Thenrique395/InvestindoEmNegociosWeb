import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, RegisterPayload } from '../auth.service';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.scss']
})
export class SignupComponent {
  @Output() signedUp = new EventEmitter<void>();

  feedback = '';
  error = '';
  loading = false;

  form: FormGroup;

  constructor(private fb: FormBuilder, private auth: AuthService, private router: Router) {
    this.form = this.fb.group({
      nome: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      senha: ['', [Validators.required, Validators.minLength(6)]],
      aceitarTermos: [false, Validators.requiredTrue]
    });
  }

  onSubmit(): void {
    if (this.loading) return;
    this.feedback = '';
    this.error = '';

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error = 'Revise os campos destacados.';
      return;
    }

    this.loading = true;
    const payload = this.form.value as RegisterPayload;

    this.auth.register(payload).subscribe({
      next: () => {
        this.feedback = 'Conta criada com sucesso. Faça login para entrar.';
        this.loading = false;
        this.signedUp.emit();
      },
      error: (err: unknown) => {
        // eslint-disable-next-line no-console
        console.error('Signup error', err);
        if (err && typeof err === 'object' && 'code' in err && (err as { code?: string }).code === 'emailInUse') {
          this.form.get('email')?.setErrors({ emailInUse: true });
        }
        this.error = err instanceof Error ? err.message : 'Erro ao cadastrar. Tente novamente.';
        this.loading = false;
      }
    });
  }

  hasError(control: 'nome' | 'email' | 'senha' | 'aceitarTermos', type: string): boolean {
    const ctrl = this.form.get(control);
    return !!ctrl && ctrl.touched && ctrl.hasError(type);
  }
}
