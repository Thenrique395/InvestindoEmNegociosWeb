import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthService } from '../auth.service';
import { UiFeedbackService } from '../ui-feedback.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.scss']
})
export class ForgotPasswordComponent {
  email = '';
  loading = false;

  constructor(
    private auth: AuthService,
    private uiFeedback: UiFeedbackService
  ) {}

  onSubmit(): void {
    if (this.loading) return;
    if (!this.email || !this.email.includes('@')) {
      this.uiFeedback.warning('Informe um e-mail válido.');
      return;
    }

    this.loading = true;
    this.auth.forgotPassword(this.email).subscribe({
      next: () => {
        this.loading = false;
        this.uiFeedback.success('Se o e-mail existir, enviaremos instruções para redefinir sua senha.');
      },
      error: (err: unknown) => {
        this.loading = false;
        this.uiFeedback.error(err instanceof Error ? err.message : 'Falha ao solicitar recuperação de senha.');
      }
    });
  }
}
