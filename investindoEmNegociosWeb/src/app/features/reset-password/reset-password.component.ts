import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { UiFeedbackService } from '../../core/ui-feedback.service';
import { AuthLayoutComponent } from '../layout/auth-layout/auth-layout.component';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterModule, AuthLayoutComponent],
  templateUrl: './reset-password.component.html'
})
export class ResetPasswordComponent implements OnInit {
  private readonly _token = signal("");
  readonly token = this._token.asReadonly();
  readonly newPassword = signal("");
  readonly confirmPassword = signal("");
  private readonly _loading = signal(false);
  readonly loading = this._loading.asReadonly();
  private readonly _showNewPassword = signal(false);
  readonly showNewPassword = this._showNewPassword.asReadonly();
  private readonly _showConfirmPassword = signal(false);
  readonly showConfirmPassword = this._showConfirmPassword.asReadonly();
  private readonly _formError = signal("");
  readonly formError = this._formError.asReadonly();
  private readonly _success = signal(false);
  readonly success = this._success.asReadonly();

  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  constructor(
    private route: ActivatedRoute,
    private auth: AuthService,
    private uiFeedback: UiFeedbackService,
    private readonly destroyRef: DestroyRef
  ) {}

  ngOnInit(): void {
    this._token.set(this.route.snapshot.queryParamMap.get('token') ?? '');

    // Remove o token da barra de endereço após ler o valor, reduzindo exposição em histórico/referer.
    //
    // `history.replaceState` nativo, e não `Location.replaceState` do Angular: o segundo
    // notifica o Router, que recria este componente — e a instância recriada lê a URL já
    // sem o token, caindo em "link inválido" mesmo com um link válido. Isso quebrava a
    // redefinição de senha por completo.
    if (this.token() && this.isBrowser) {
      window.history.replaceState(window.history.state, '', '/reset-password');
    }
  }

  readonly hasToken = computed(() => this.token().trim().length > 0);

  readonly hasMinLength = computed(() => this.newPassword().length >= 8);

  readonly hasUppercase = computed(() => /[A-Z]/.test(this.newPassword()));

  readonly hasNumber = computed(() => /\d/.test(this.newPassword()));

  readonly passwordsMatch = computed(() => this.newPassword().length > 0 && this.newPassword() === this.confirmPassword());

  readonly canSubmit = computed(() => this.hasToken() && this.hasMinLength() && this.hasUppercase() && this.hasNumber() && this.passwordsMatch() && !this.loading() && !this.success());

  get hasPasswordInput(): boolean {
    return this.newPassword().length > 0;
  }

  get hasConfirmInput(): boolean {
    return this.confirmPassword().length > 0;
  }

  toggleNewPasswordVisibility(): void {
    this._showNewPassword.set(!this.showNewPassword());
  }

  toggleConfirmPasswordVisibility(): void {
    this._showConfirmPassword.set(!this.showConfirmPassword());
  }

  onSubmit(): void {
    if (this.loading()) return;
    this._formError.set('');

    if (!this.hasToken()) {
      this._formError.set('Token de recuperação ausente ou inválido.');
      this.uiFeedback.error(this.formError());
      return;
    }
    if (!this.hasMinLength() || !this.hasUppercase() || !this.hasNumber()) {
      this._formError.set('A senha deve ter no mínimo 8 caracteres, 1 letra maiúscula e 1 número.');
      this.uiFeedback.warning(this.formError());
      return;
    }
    if (!this.passwordsMatch()) {
      this._formError.set('As senhas não conferem.');
      this.uiFeedback.warning(this.formError());
      return;
    }

    this._loading.set(true);
    this.auth.resetPassword(this.token(), this.newPassword()).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this._loading.set(false);
        this._success.set(true);
        this.uiFeedback.success('Senha redefinida com sucesso. Faça login novamente.');
      },
      error: (err: unknown) => {
        this._loading.set(false);
        this._formError.set(err instanceof Error ? err.message : 'Falha ao redefinir senha.');
        this.uiFeedback.error(this.formError());
      }
    });
  }
}
