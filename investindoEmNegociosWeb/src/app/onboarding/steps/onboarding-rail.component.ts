import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

interface RailStep {
  readonly index: number;
  readonly label: string;
  readonly title: string;
  readonly desc: string;
}

/**
 * Trilho lateral do onboarding: intro contextual por passo + marcadores das
 * etapas (ativa/concluída). Presentacional — depende só do passo atual.
 */
@Component({
  selector: 'app-onboarding-rail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [':host { display: contents; }'],
  template: `
    <aside class="onboarding-rail">
      <div class="onboarding-rail__intro">
        <p class="onboarding-rail__eyebrow">Configuração inicial</p>
        @switch (step()) {
          @case (0) {
            <h1 class="onboarding-rail__title">Escolha a direção do seu controle financeiro.</h1>
            <p class="onboarding-rail__desc">
              Vamos definir qual foco deve orientar suas primeiras recomendações e prioridades no dashboard.
            </p>
          }
          @case (1) {
            <h1 class="onboarding-rail__title">Ajuste como o sistema vai orientar você.</h1>
            <p class="onboarding-rail__desc">
              Escolha o estilo dos insights e, nos planos elegíveis, personalize o início da sua competência mensal.
            </p>
          }
          @case (2) {
            <h1 class="onboarding-rail__title">Complete os dados que personalizam sua experiência.</h1>
            <p class="onboarding-rail__desc">
              Essas informações organizam seu perfil e deixam a conta inicial pronta para uso.
            </p>
          }
          @case (3) {
            <h1 class="onboarding-rail__title">Finalize sua estrutura inicial.</h1>
            <p class="onboarding-rail__desc">
              Crie a conta principal e registre os primeiros lançamentos para começar com o dashboard pronto.
            </p>
          }
        }
      </div>

      <div class="onboarding-rail__steps" aria-label="Etapas do onboarding">
        @for (item of steps; track item.index) {
          <article
            class="onboarding-step"
            [class.onboarding-step--active]="step() === item.index"
            [class.onboarding-step--done]="step() > item.index"
            [attr.aria-current]="step() === item.index ? 'step' : null">
            <div class="onboarding-step__index" aria-hidden="true">{{ item.label }}</div>
            <div>
              <strong>{{ item.title }}</strong>
              <span>{{ item.desc }}</span>
            </div>
          </article>
        }
      </div>

      @if (focusLabel() || modeLabel()) {
        <div class="onboarding-rail__summary">
          <p class="onboarding-rail__summary-title">Suas escolhas</p>
          @if (focusLabel()) {
            <div class="onboarding-rail__summary-item">
              <span>Objetivo</span>
              <strong>{{ focusLabel() }}</strong>
            </div>
          }
          @if (modeLabel()) {
            <div class="onboarding-rail__summary-item">
              <span>Estilo de insights</span>
              <strong>{{ modeLabel() }}</strong>
            </div>
          }
        </div>
      }
    </aside>
  `
})
export class OnboardingRailComponent {
  readonly step = input.required<number>();
  readonly focusLabel = input('');
  readonly modeLabel = input('');

  readonly steps: RailStep[] = [
    { index: 0, label: '1', title: 'Objetivo inicial', desc: 'Definir a prioridade que vai orientar seus próximos passos.' },
    { index: 1, label: '2', title: 'Preferências iniciais', desc: 'Escolher como o sistema apresenta insights e organiza sua rotina.' },
    { index: 2, label: '3', title: 'Dados básicos', desc: 'Salvar os dados essenciais para personalizar seu perfil.' },
    { index: 3, label: '4', title: 'Conta e lançamentos', desc: 'Criar a conta principal e registrar os primeiros lançamentos.' }
  ];
}
