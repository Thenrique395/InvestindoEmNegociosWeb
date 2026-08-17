import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';

interface RailStep {
  readonly index: number;
  readonly label: string;
  readonly title: string;
  readonly desc: string;
}

/**
 * Trilho lateral do onboarding: marca no topo, as quatro etapas como linha do
 * tempo e, na base, o aviso de que dá para sair e voltar depois.
 *
 * Em tela estreita ele vira o cabeçalho da tela: a linha do tempo colapsa em
 * quatro segmentos de progresso e a identidade (avatar, sair) sobe para cá,
 * porque a barra branca do topo não cabe ao lado do conteúdo. É por isso que
 * este componente recebe o usuário — no desktop nada disso aparece.
 *
 * Presentacional: o painel é sempre navy, nos dois temas, como o das telas de
 * autenticação.
 */
@Component({
  selector: 'app-onboarding-rail',
  standalone: true,
  imports: [RouterLink, DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [':host { display: contents; }'],
  template: `
    <aside class="onboarding-rail">
      <div class="onboarding-rail__head">
        <a class="onboarding-rail__brand" routerLink="/" aria-label="Investindo em Negócios">
          <img src="assets/logoHeaderInvestindoemNegocios.png" alt="" width="56" height="56" />
          <span class="onboarding-rail__wordmark" aria-hidden="true">
            <span>Investindo <span class="onboarding-rail__wordmark-soft">em</span></span>
            <span>Negócios</span>
          </span>
        </a>

        <!-- Só em tela estreita: no desktop esta identidade vive na barra branca. -->
        <div class="onboarding-rail__identity">
          <span class="onboarding-rail__avatar" aria-hidden="true">{{ userInitials() }}</span>
          <button
            type="button"
            class="onboarding-rail__logout"
            [attr.aria-label]="'Sair da conta de ' + displayName()"
            (click)="logout.emit()">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M15 17l-1.4-1.4L16.2 13H9v-2h7.2L13.6 8.4 15 7l5 5-5 5Z" fill="currentColor" stroke="none" />
              <path d="M12 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
            </svg>
          </button>
        </div>
      </div>

      <ol class="onboarding-rail__steps" aria-label="Etapas do onboarding">
        @for (item of steps; track item.index) {
          <li
            class="onboarding-step"
            [class.onboarding-step--active]="step() === item.index"
            [class.onboarding-step--done]="step() > item.index"
            [attr.aria-current]="step() === item.index ? 'step' : null">
            <span class="onboarding-step__index" aria-hidden="true">{{ item.label }}</span>
            <span class="onboarding-step__text">
              <strong>{{ item.title }}</strong>
              <span>{{ item.desc }}</span>
            </span>
          </li>
        }
      </ol>

      <!-- Passo e percentual: em tela estreita substituem o cartão de progresso,
           que não cabe ao lado do título. -->
      <p class="onboarding-rail__stage">
        <span>Passo {{ step() + 1 }} de {{ totalSteps() }}</span>
        <span>{{ progressPercent() | number: '1.0-0' }}%</span>
      </p>

      <div class="onboarding-rail__note">
        <p class="onboarding-rail__note-label">Leva cerca de 3 minutos</p>
        <p class="onboarding-rail__note-text">
          Você pode sair e retomar depois. O que já foi preenchido fica salvo.
        </p>
      </div>
    </aside>
  `
})
export class OnboardingRailComponent {
  readonly step = input.required<number>();
  readonly totalSteps = input(4);
  readonly progressPercent = input(0);

  /** Identidade — usada só na versão estreita (ver comentário da classe). */
  readonly userInitials = input('');
  readonly displayName = input('');

  readonly logout = output<void>();

  readonly steps: RailStep[] = [
    { index: 0, label: '1', title: 'Objetivo inicial', desc: 'Definir a prioridade que vai orientar seus próximos passos.' },
    { index: 1, label: '2', title: 'Preferências iniciais', desc: 'Escolher como o sistema apresenta insights e organiza sua rotina.' },
    { index: 2, label: '3', title: 'Dados básicos', desc: 'Salvar os dados essenciais para personalizar seu perfil.' },
    { index: 3, label: '4', title: 'Conta e lançamentos', desc: 'Criar a conta principal e registrar os primeiros lançamentos.' }
  ];
}
