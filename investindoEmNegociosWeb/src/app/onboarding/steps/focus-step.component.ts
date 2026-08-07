import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FocusArea, FocusOption } from '../onboarding.types';

/**
 * Passo 1 do onboarding: escolha do objetivo inicial (foco).
 * Componente presentacional — recebe as opções e a seleção atual, e emite
 * a escolha e o avanço. Toda a orquestração continua no OnboardingComponent.
 */
@Component({
  selector: 'app-onboarding-focus-step',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [':host { display: contents; }'],
  template: `
    <div class="onboarding-step-shell">
      <section class="onboarding-panel onboarding-panel--accent">
        <div class="onboarding-panel__header">
          <strong>Qual seu objetivo principal agora?</strong>
          <span>Escolha a direção que melhor representa seu momento atual.</span>
        </div>
        <div class="onboarding-focus-grid">
          @for (item of options(); track item.id) {
            <label
              class="onboarding-focus-card"
              [class.onboarding-focus-card--selected]="selected() === item.id"
              (click)="select.emit(item.id)">
              <span class="onboarding-focus-card__tooltip-anchor">
                <span
                  class="onboarding-focus-card__tooltip-trigger"
                  tabindex="0"
                  [attr.aria-label]="item.tooltip">
                  ?
                </span>
                <span class="onboarding-focus-card__tooltip">{{ item.tooltip }}</span>
              </span>
              <input
                class="sr-only"
                type="radio"
                name="focusGoal"
                [value]="item.id"
                [ngModel]="selected()"
                (ngModelChange)="select.emit($event)"
                [ngModelOptions]="{ standalone: true }" />
              <div class="onboarding-focus-card__head">
                <span class="onboarding-focus-card__icon" aria-hidden="true">
                  @switch (item.icon) {
                    @case ('growth') {
                      <svg viewBox="0 0 24 24" role="presentation" focusable="false">
                        <path d="M4.5 9.5h11a2 2 0 0 1 2 2v5.5H6.5a2 2 0 0 1-2-2z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" />
                        <path d="M15.5 9.5V8.4a1.9 1.9 0 0 0-1.9-1.9H8.9A1.9 1.9 0 0 0 7 8.4v1.1" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
                        <path d="M8 13h4.2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
                      </svg>
                    }
                    @case ('debt') {
                      <svg viewBox="0 0 24 24" role="presentation" focusable="false">
                        <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="1.8" />
                        <path d="M8.5 12h7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
                        <path d="M12 8.5v7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" opacity=".35" />
                      </svg>
                    }
                    @case ('invest') {
                      <svg viewBox="0 0 24 24" role="presentation" focusable="false">
                        <path d="M5 17.5V7.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
                        <path d="M5 17.5h14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
                        <path d="M7.5 14.5 11 11l2.8 2.8L18.5 9" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
                        <path d="M15.8 9H18.5v2.7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
                      </svg>
                    }
                    @case ('shield') {
                      <svg viewBox="0 0 24 24" role="presentation" focusable="false">
                        <path d="M12 3l7 3v5c0 4.4-2.8 7.6-7 10-4.2-2.4-7-5.6-7-10V6l7-3z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" />
                        <path d="M12 8.2v6.1" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
                        <path d="M9.3 11.3h5.4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
                      </svg>
                    }
                  }
                </span>
                <strong>{{ item.title }}</strong>
              </div>
              <p>{{ item.description }}</p>
            </label>
          }
        </div>
        <div class="onboarding-actions onboarding-actions--footer">
          <div class="onboarding-actions__meta">
            <strong>Escolha uma direção</strong>
            <span>Selecione o objetivo que melhor representa seu momento para seguir para preferências.</span>
          </div>
          <div class="onboarding-actions__group onboarding-actions__group--footer">
            <button class="btn-primary onboarding-btn onboarding-btn--primary onboarding-btn--confirm" type="button" (click)="next.emit()">
              Continuar para preferências
            </button>
          </div>
        </div>
      </section>
    </div>
  `
})
export class FocusStepComponent {
  readonly options = input.required<FocusOption[]>();
  readonly selected = input.required<FocusArea | null>();

  readonly select = output<FocusArea>();
  readonly next = output<void>();
}
