import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIf } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService, AuthResponse } from '../auth.service';

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

  constructor(private auth: AuthService, private router: Router) {}

  onSubmit(): void {
    if (this.loading) return;
    this.feedback = '';
    this.error = '';
    this.loading = true;

    this.auth.login(this.email, this.password).subscribe({
      next: (res: AuthResponse) => {
        this.feedback = `Autenticado! Token mock salvo (expira em ${res.expiresIn}s).`;
        try {
          localStorage.setItem('current_user', this.email);
        } catch {
          /* ignore in non-browser */
        }
        this.loading = false;
        this.router.navigateByUrl('/');
      },
      error: (err: unknown) => {
        this.error = err instanceof Error ? err.message : 'Erro ao autenticar';
        this.loading = false;
      }
    });
  }
}
