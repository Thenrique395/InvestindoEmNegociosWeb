import { Component, OnDestroy, OnInit } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { Meta, Title } from '@angular/platform-browser';
import { RouterModule } from '@angular/router';
import { AuthService } from '../auth.service';
import { UiFeedbackService } from '../ui-feedback.service';
import { DEFAULT_META_DESCRIPTION, DEFAULT_TITLE } from '../seo-defaults';
import { AuthLayoutComponent } from '../auth-layout/auth-layout.component';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [FormsModule, RouterModule, AuthLayoutComponent],
  templateUrl: './forgot-password.component.html'
})
export class ForgotPasswordComponent implements OnInit, OnDestroy {
  email = '';
  loading = false;
  success = false;
  formError = '';

  constructor(
    private auth: AuthService,
    private uiFeedback: UiFeedbackService,
    private title: Title,
    private meta: Meta
  ) {}

  ngOnInit(): void {
    this.title.setTitle('Recuperar senha — Investindo em Negócios');
    this.meta.updateTag({
      name: 'description',
      content: 'Solicite um link para redefinir a senha da sua conta Investindo em Negócios.'
    });
    this.meta.updateTag({ name: 'robots', content: 'noindex, nofollow' });
  }

  ngOnDestroy(): void {
    this.title.setTitle(DEFAULT_TITLE);
    this.meta.updateTag({ name: 'description', content: DEFAULT_META_DESCRIPTION });
    this.meta.removeTag("name='robots'");
  }

  onSubmit(): void {
    if (this.loading) return;
    this.formError = '';
    if (!this.email || !this.email.includes('@')) {
      this.formError = 'Informe um e-mail válido.';
      this.uiFeedback.warning(this.formError);
      return;
    }

    this.loading = true;
    this.auth.forgotPassword(this.email).subscribe({
      next: () => {
        this.loading = false;
        this.success = true;
        this.uiFeedback.success('Se o e-mail existir, enviaremos instruções para redefinir sua senha.');
      },
      error: (err: unknown) => {
        this.loading = false;
        this.formError = err instanceof Error ? err.message : 'Falha ao solicitar recuperação de senha.';
        this.uiFeedback.error(this.formError);
      }
    });
  }
}
