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

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private auth: AuthService,
    private uiFeedback: UiFeedbackService
  ) {}

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') ?? '';
  }

  onSubmit(): void {
    if (this.loading) return;
    if (!this.token) {
      this.uiFeedback.error('Token de recuperação ausente.');
      return;
    }
    if (!this.newPassword || this.newPassword.length < 8) {
      this.uiFeedback.warning('A nova senha deve ter no mínimo 8 caracteres.');
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.uiFeedback.warning('As senhas não conferem.');
      return;
    }

    this.loading = true;
    this.auth.resetPassword(this.token, this.newPassword).subscribe({
      next: () => {
        this.loading = false;
        this.uiFeedback.success('Senha redefinida com sucesso. Faça login novamente.');
        this.router.navigateByUrl('/login');
      },
      error: (err: unknown) => {
        this.loading = false;
        this.uiFeedback.error(err instanceof Error ? err.message : 'Falha ao redefinir senha.');
      }
    });
  }
}
