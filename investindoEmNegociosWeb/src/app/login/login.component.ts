import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIf } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService, AuthResponse } from '../auth.service';
import { ProfileService } from '../profile.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, NgIf],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  email = '';
  password = '';
  feedback = '';
  error = '';
  loading = false;

  constructor(private auth: AuthService, private router: Router, private profile: ProfileService) {}

  onSubmit(): void {
    if (this.loading) return;
    this.feedback = '';
    this.error = '';

    if (!this.email || !this.email.includes('@')) {
      this.error = 'Informe um e-mail válido.';
      return;
    }
    if (!this.password || this.password.length < 4) {
      this.error = 'Informe sua senha (mínimo 4 caracteres).';
      return;
    }

    this.loading = true;

    this.auth.login(this.email, this.password).subscribe({
      next: (res: AuthResponse) => {
        this.feedback = `Autenticado! Bem-vindo, ${res.name}.`;
        this.profile.getProfile().subscribe({
          next: (profile) => {
            this.loading = false;
            const incomplete =
              !profile ||
              !profile.document ||
              profile.document.replace(/\D/g, '').length < 11 ||
              !profile.phone ||
              profile.phone.length < 10;

            if (incomplete) {
              this.router.navigateByUrl('/onboarding');
            } else {
              this.router.navigateByUrl('/dashboard');
            }
          },
          error: () => {
            this.loading = false;
            this.router.navigateByUrl('/onboarding');
          }
        });
      },
      error: (err: unknown) => {
        if (err instanceof HttpErrorResponse) {
          if (err.status === 423) {
            this.error = 'Conta bloqueada temporariamente. Tente novamente em alguns minutos.';
          } else if (err.status === 429) {
            this.error = 'Muitas tentativas. Aguarde um pouco e tente novamente.';
          } else if (err.status === 401) {
            this.error = 'E-mail ou senha incorretos.';
          } else {
            this.error = err.error?.detail || err.error?.title || 'Erro ao autenticar';
          }
        } else {
          this.error = err instanceof Error ? err.message : 'Erro ao autenticar';
        }
        this.loading = false;
      }
    });
  }
}
