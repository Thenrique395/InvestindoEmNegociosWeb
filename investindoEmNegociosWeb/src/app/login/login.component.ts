import { Component, OnDestroy, OnInit } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthService, AuthSessionResponse } from '../auth.service';
import { ProfileService } from '../profile.service';
import { UiFeedbackService } from '../ui-feedback.service';
import { DEFAULT_META_DESCRIPTION, DEFAULT_TITLE } from '../seo-defaults';
import { AuthLayoutComponent } from '../auth-layout/auth-layout.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterModule, AuthLayoutComponent],
  templateUrl: './login.component.html',
})
export class LoginComponent implements OnInit, OnDestroy {
  email = '';
  password = '';
  loading = false;
  showPassword = false;
  emailNotConfirmed = false;
  resending = false;

  constructor(
    private auth: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private profile: ProfileService,
    private uiFeedback: UiFeedbackService,
    private title: Title,
    private meta: Meta
  ) {}

  ngOnInit(): void {
    this.title.setTitle('Entrar — Investindo em Negócios');
    this.meta.updateTag({
      name: 'description',
      content: 'Acesse sua conta para continuar acompanhando receitas, despesas, cartões e metas em um só painel.'
    });

    if (this.route.snapshot.queryParamMap.get('created') === '1') {
      this.uiFeedback.success('Conta criada! Enviamos um e-mail de confirmação — confirme para poder entrar.');
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { created: null, confirm: null },
        queryParamsHandling: 'merge',
        replaceUrl: true
      });
    }

    // Double opt-in: o link do e-mail aponta direto pra cá com ?confirmToken=... —
    // confirmamos aqui mesmo (a tela de login renderiza de forma confiável) e mostramos o resultado.
    const confirmToken = this.route.snapshot.queryParamMap.get('confirmToken');
    if (confirmToken) {
      this.auth.confirmEmail(confirmToken).subscribe({
        next: () => this.uiFeedback.success('E-mail validado com sucesso! Faça login para entrar.'),
        error: () =>
          this.uiFeedback.error('Link de confirmação inválido ou expirado. Faça login para reenviar o e-mail.')
      });
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { confirmToken: null },
        queryParamsHandling: 'merge',
        replaceUrl: true
      });
    }
  }

  ngOnDestroy(): void {
    this.title.setTitle(DEFAULT_TITLE);
    this.meta.updateTag({ name: 'description', content: DEFAULT_META_DESCRIPTION });
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  resendConfirmation(): void {
    if (this.resending || !this.email) return;
    this.resending = true;
    this.auth.resendConfirmation(this.email).subscribe({
      next: () => {
        this.resending = false;
        this.uiFeedback.success('Se a conta estiver pendente, reenviamos o e-mail de confirmação.');
      },
      error: () => {
        this.resending = false;
        this.uiFeedback.success('Se a conta estiver pendente, reenviamos o e-mail de confirmação.');
      }
    });
  }

  onSubmit(): void {
    if (this.loading) return;
    if (!this.email || !this.email.includes('@')) {
      this.uiFeedback.warning('Informe um e-mail válido.');
      return;
    }
    if (!this.password || this.password.length < 4) {
      this.uiFeedback.warning('Informe sua senha (mínimo 4 caracteres).');
      return;
    }

    this.loading = true;
    this.emailNotConfirmed = false;

    this.auth.login(this.email, this.password).subscribe({
      next: (res: AuthSessionResponse) => {
        this.uiFeedback.success(`Bem-vindo, ${res.name}.`);
        this.profile.getProfile().subscribe({
          next: (profile) => {
            this.loading = false;
            const returnTo = this.route.snapshot.queryParamMap.get('returnTo');
            const plan = this.route.snapshot.queryParamMap.get('plan');
            const cycle = this.route.snapshot.queryParamMap.get('cycle');
            const incomplete =
              !profile ||
              !profile.document ||
              profile.document.replace(/\D/g, '').length < 11 ||
              !profile.phone ||
              profile.phone.length < 10;

            if (returnTo) {
              this.router.navigate([returnTo], {
                queryParams: {
                  plan: plan || undefined,
                  cycle: cycle || undefined
                }
              });
              return;
            }

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
            this.uiFeedback.error('Conta bloqueada temporariamente. Tente novamente em alguns minutos.');
          } else if (err.status === 429) {
            this.uiFeedback.error('Muitas tentativas. Aguarde um pouco e tente novamente.');
          } else if (err.status === 403 && err.error?.code === 'email_not_confirmed') {
            // Double opt-in: credenciais ok, mas e-mail não confirmado. Oferece reenviar.
            this.emailNotConfirmed = true;
            this.uiFeedback.error('Confirme seu e-mail para entrar. Verifique sua caixa de entrada.');
          } else if (err.status === 401) {
            this.uiFeedback.error('E-mail ou senha incorretos.');
          } else {
            this.uiFeedback.error(err.error?.detail || err.error?.title || 'Erro ao autenticar');
          }
        } else {
          this.uiFeedback.error(err instanceof Error ? err.message : 'Erro ao autenticar');
        }
        this.loading = false;
      }
    });
  }
}
