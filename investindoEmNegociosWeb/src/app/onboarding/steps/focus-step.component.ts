import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FocusArea, FocusOption } from '../onboarding.types';

/**
 * Passo 1 do onboarding: escolha do objetivo inicial (foco).
 *
 * Componente presentacional — recebe as opções e a seleção atual, e emite a
 * escolha e o avanço. Toda a orquestração continua no OnboardingComponent.
 *
 * A explicação de cada opção aparece como uma faixa abaixo da grade, e só
 * depois da escolha: antes disso ela seria um texto sobre nada. Era um tooltip
 * no "?" de cada card, que escondia justamente o texto que ajuda a decidir.
 */
@Component({
  selector: 'app-onboarding-focus-step',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [':host { display: contents; }'],
  template: `
    <div class="onboarding-choice-block">
      <div class="onboarding-choice-grid">
        @for (item of options(); track item.id) {
          <label
            class="onboarding-choice"
            [class.onboarding-choice--selected]="selected() === item.id">
            <input
              class="sr-only"
              type="radio"
              name="focusGoal"
              [value]="item.id"
              [ngModel]="selected()"
              (ngModelChange)="select.emit($event)"
              [ngModelOptions]="{ standalone: true }" />

            <span class="onboarding-choice__top">
              <span class="onboarding-choice__icon" aria-hidden="true">
                @switch (item.icon) {
                  @case ('growth') {
                    <svg viewBox="0 0 24 24" role="presentation" focusable="false">
                      <path d="M4 17.5 9.5 12l3.2 3.2L20 7.6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
                      <path d="M15.4 7.6H20v4.6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
                    </svg>
                  }
                  @case ('debt') {
                    <svg viewBox="0 0 24 24" role="presentation" focusable="false">
                      <path d="M12 4v10m0 0 3.8-3.8M12 14l-3.8-3.8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
                      <path d="M5 17v1.6A1.4 1.4 0 0 0 6.4 20h11.2a1.4 1.4 0 0 0 1.4-1.4V17" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
                    </svg>
                  }
                  @case ('invest') {
                    <svg viewBox="0 0 24 24" role="presentation" focusable="false">
                      <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="1.8" />
                      <circle cx="12" cy="12" r="3.4" fill="none" stroke="currentColor" stroke-width="1.8" />
                      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
                    </svg>
                  }
                  @case ('shield') {
                    <svg viewBox="0 0 24 24" role="presentation" focusable="false">
                      <path d="M12 3.4 5.4 6.2v5.2c0 4.1 2.7 7.8 6.6 9.2 3.9-1.4 6.6-5.1 6.6-9.2V6.2Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" />
                    </svg>
                  }
                }
              </span>
              <span class="onboarding-choice__radio" aria-hidden="true"></span>
            </span>

            <strong class="onboarding-choice__title">{{ item.title }}</strong>
            <span class="onboarding-choice__desc">{{ item.description }}</span>
          </label>
        }
      </div>

      @if (selectedOption(); as option) {
        <p class="onboarding-insight">
          <svg class="onboarding-insight__icon" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.7" />
            <path d="M12 11v5.2M12 7.9v.01" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" />
          </svg>
          <span>{{ option.tooltip }}</span>
        </p>
      }

      <div class="onboarding-footer">
        <div class="onboarding-footer__meta">
          <strong>Isso orienta o resto</strong>
          <span>O foco define quais insights e alertas você vê primeiro no painel.</span>
        </div>
        <button
          class="onboarding-cta"
          type="button"
          [disabled]="!selected()"
          (click)="next.emit()">
          Continuar
        </button>
      </div>
    </div>
  `
})
export class FocusStepComponent {
  readonly options = input.required<FocusOption[]>();
  readonly selected = input.required<FocusArea | null>();

  readonly select = output<FocusArea>();
  readonly next = output<void>();

  readonly selectedOption = computed(() => this.options().find((o) => o.id === this.selected()) ?? null);
}
