import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthService } from '../auth.service';
import { UiFeedbackService } from '../ui-feedback.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.scss']
})
export class ResetPasswordComponent implements OnInit {
  token = '';
  newPassword = '';
  confirmPassword = '';
  loading = false;
  showNewPassword = false;
  showConfirmPassword = false;
  formError = '';
  success = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private auth: AuthService,
    private uiFeedback: UiFeedbackService
  ) {}

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') ?? '';
  }

  get hasToken(): boolean {
    return this.token.trim().length > 0;
  }

  get hasMinLength(): boolean {
    return this.newPassword.length >= 8;
  }

  get hasUppercase(): boolean {
    return /[A-Z]/.test(this.newPassword);
  }

  get hasNumber(): boolean {
    return /\d/.test(this.newPassword);
  }

  get passwordsMatch(): boolean {
    return this.newPassword.length > 0 && this.newPassword === this.confirmPassword;
  }

  get canSubmit(): boolean {
    return this.hasToken && this.hasMinLength && this.hasUppercase && this.hasNumber && this.passwordsMatch && !this.loading && !this.success;
  }

  get hasPasswordInput(): boolean {
    return this.newPassword.length > 0;
  }

  get hasConfirmInput(): boolean {
    return this.confirmPassword.length > 0;
  }

  toggleNewPasswordVisibility(): void {
    this.showNewPassword = !this.showNewPassword;
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  onSubmit(): void {
    if (this.loading) return;
    this.formError = '';

    if (!this.hasToken) {
      this.formError = 'Token de recuperação ausente ou inválido.';
      this.uiFeedback.error(this.formError);
      return;
    }
    if (!this.hasMinLength || !this.hasUppercase || !this.hasNumber) {
      this.formError = 'A senha deve ter no mínimo 8 caracteres, 1 letra maiúscula e 1 número.';
      this.uiFeedback.warning(this.formError);
      return;
    }
    if (!this.passwordsMatch) {
      this.formError = 'As senhas não conferem.';
      this.uiFeedback.warning(this.formError);
      return;
    }

    this.loading = true;
    this.auth.resetPassword(this.token, this.newPassword).subscribe({
      next: () => {
        this.loading = false;
        this.success = true;
        this.uiFeedback.success('Senha redefinida com sucesso. Faça login novamente.');
      },
      error: (err: unknown) => {
        this.loading = false;
        this.formError = err instanceof Error ? err.message : 'Falha ao redefinir senha.';
        this.uiFeedback.error(this.formError);
      }
    });
  }
}
