import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { OnboardingService } from '../../core/onboarding.service';

/**
 * Faixa de retorno para quem chegou aqui de dentro do cadastro inicial.
 *
 * O formulário de despesa inicial oferece "Cadastrar cartão" e "Criar nova
 * categoria"; o guard passa a deixar essas telas abrirem durante o onboarding
 * (ver auth.guard.ts), e esta faixa é o caminho de volta — sem ela a pessoa
 * fica numa tela solta, com a barra lateral ainda apontando para o cadastro.
 *
 * Só aparece enquanto o onboarding não terminou, e por status do servidor, não
 * por parâmetro na URL: assim sobrevive a um F5.
 */
@Component({
  selector: 'app-onboarding-return-banner',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (pendente()) {
      <div class="onb-return" role="status">
        <div class="onb-return__body">
          <strong class="onb-return__title">Cadastro inicial em andamento</strong>
          <span class="onb-return__msg">Termine o que veio fazer aqui e volte para concluir os primeiros passos.</span>
        </div>
        <a routerLink="/onboarding" class="onb-return__action">Voltar ao cadastro</a>
      </div>
    }
  `,
  styles: [`
    .onb-return {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      flex-wrap: wrap;
      margin-bottom: 1rem;
      padding: 0.65rem 1.25rem;
      border: 1px solid color-mix(in srgb, var(--brand) 30%, transparent);
      border-radius: var(--radius-panel);
      background: color-mix(in srgb, var(--brand) 10%, var(--surface));
      font-size: var(--fs-meta);
    }

    .onb-return__body {
      display: flex;
      flex-wrap: wrap;
      gap: 0.25rem 0.5rem;
      align-items: baseline;
      min-width: 0;
    }

    .onb-return__title {
      white-space: nowrap;
      color: var(--text);
    }

    .onb-return__msg {
      color: var(--text-secondary);
    }

    .onb-return__action {
      white-space: nowrap;
      flex-shrink: 0;
      font-weight: var(--fw-bold);
      text-decoration: underline;
      color: var(--brand);

      &:hover {
        opacity: 0.8;
      }
    }
  `]
})
export class OnboardingReturnBannerComponent implements OnInit {
  readonly pendente = signal(false);

  constructor(
    private readonly onboarding: OnboardingService,
    private readonly cdr: ChangeDetectorRef,
    private readonly destroyRef: DestroyRef
  ) {}

  ngOnInit(): void {
    this.onboarding.getStatus()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (status) => {
          this.pendente.set(!status?.completed);
          this.cdr.markForCheck();
        },
        // Falha de status não vira faixa fantasma para quem já terminou.
        error: () => void 0
      });
  }
}
