import { ChangeDetectionStrategy, Component, DestroyRef, OnDestroy, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { FormsModule } from '@angular/forms';
import { Meta, Title } from '@angular/platform-browser';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { UiFeedbackService } from '../../core/ui-feedback.service';
import { DEFAULT_META_DESCRIPTION, DEFAULT_TITLE } from '../../core/seo-defaults';
import { AuthLayoutComponent } from '../layout/auth-layout/auth-layout.component';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterModule, AuthLayoutComponent],
  templateUrl: './forgot-password.component.html'
})
export class ForgotPasswordComponent implements OnInit, OnDestroy {
  readonly email = signal("");
  private readonly _loading = signal(false);
  readonly loading = this._loading.asReadonly();
  private readonly _success = signal(false);
  readonly success = this._success.asReadonly();
  private readonly _formError = signal("");
  readonly formError = this._formError.asReadonly();

  constructor(
    private auth: AuthService,
    private uiFeedback: UiFeedbackService,
    private title: Title,
    private meta: Meta,
    private readonly destroyRef: DestroyRef
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
    if (this.loading()) return;
    this._formError.set('');
    if (!this.email() || !this.email().includes('@')) {
      this._formError.set('Informe um e-mail válido.');
      this.uiFeedback.warning(this.formError());
      return;
    }

    this._loading.set(true);
    this.auth.forgotPassword(this.email()).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this._loading.set(false);
        this._success.set(true);
        this.uiFeedback.success('Se o e-mail existir, enviaremos instruções para redefinir sua senha.');
      },
      error: (err: unknown) => {
        this._loading.set(false);
        this._formError.set(err instanceof Error ? err.message : 'Falha ao solicitar recuperação de senha.');
        this.uiFeedback.error(this.formError());
      }
    });
  }
}
