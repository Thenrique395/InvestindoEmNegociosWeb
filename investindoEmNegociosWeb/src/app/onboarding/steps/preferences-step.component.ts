import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IntelligenceMode, IntelligenceModeOption } from '../onboarding.types';

/**
 * Passo 2 do onboarding: preferências (estilo dos insights + dia de início da
 * competência mensal). Presentacional — a persistência de draft e o avanço
 * ficam no OnboardingComponent.
 */
@Component({
  selector: 'app-onboarding-preferences-step',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [':host { display: contents; }'],
  template: `
    <div class="onboarding-step-shell">
      <div class="onboarding-split">
        <section class="onboarding-panel">
          <div class="onboarding-panel__header">
            <strong>Como você prefere os insights financeiros?</strong>
            <span>Escolha a intensidade de orientação inicial.</span>
          </div>
          <div class="onboarding-mode-grid">
            @for (mode of options(); track mode.id) {
              <label
                class="onboarding-focus-card"
                [class.onboarding-focus-card--selected]="selectedMode() === mode.id">
                @if (selectedMode() === mode.id) {
                  <span class="onboarding-focus-card__tick" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                      <path d="M5 12l4 4 10-10" stroke-linecap="round" stroke-linejoin="round" />
                    </svg>
                  </span>
                } @else {
                  <span class="onboarding-focus-card__tooltip-anchor">
                    <span
                      class="onboarding-focus-card__tooltip-trigger"
                      tabindex="0"
                      [attr.aria-label]="mode.tooltip">
                      ?
                    </span>
                    <span class="onboarding-focus-card__tooltip">{{ mode.tooltip }}</span>
                  </span>
                }
                <input
                  class="sr-only"
                  type="radio"
                  name="intelligenceMode"
                  [value]="mode.id"
                  [ngModel]="selectedMode()"
                  (ngModelChange)="selectMode.emit($event)"
                  [ngModelOptions]="{ standalone: true }" />
                <div class="onboarding-focus-card__head">
                  <span class="onboarding-focus-card__icon" aria-hidden="true">
                    @switch (mode.icon) {
                      @case ('balance') {
                        <svg viewBox="0 0 24 24" role="presentation" focusable="false">
                          <path d="M12 5.5v13" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
                          <path d="M7 9h10" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
                          <path d="M9 9 6.5 13h5z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" />
                          <path d="M17.5 9 15 13h5z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" />
                        </svg>
                      }
                      @case ('shield') {
                        <svg viewBox="0 0 24 24" role="presentation" focusable="false">
                          <path d="M12 3l7 3v5c0 4.4-2.8 7.6-7 10-4.2-2.4-7-5.6-7-10V6l7-3z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" />
                          <path d="M9 12h6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
                        </svg>
                      }
                    }
                  </span>
                  <strong>{{ mode.title }}</strong>
                </div>
                <p>{{ mode.description }}</p>
              </label>
            }
          </div>
        </section>
        <section class="onboarding-panel">
          <div class="onboarding-panel__header">
            <strong>Dia de início da competência</strong>
            @if (canEditCarryOverDay()) {
              <span>Defina o recorte mensal que melhor acompanha sua rotina.</span>
            }
            @if (!canEditCarryOverDay()) {
              <span>No plano Basic, a competência usa o mês calendário padrão.</span>
            }
          </div>
          @if (canEditCarryOverDay()) {
            <div class="onboarding-field onboarding-field--compact">
              <select [ngModel]="carryOverDay()" (ngModelChange)="carryOverDayChange.emit($event)" [ngModelOptions]="{ standalone: true }">
                @for (day of carryOverDayOptions(); track day) {
                  <option [ngValue]="day">Dia {{ day }}</option>
                }
              </select>
              <small>Ex.: dia 10 considera a competência de 10 até o dia 9 do mês seguinte.</small>
            </div>
          }
          @if (!canEditCarryOverDay()) {
            <div class="onboarding-status onboarding-status--info">
              O sistema vai considerar <strong>Dia 1</strong> como início da competência, usando o mês calendário padrão.
            </div>
          }
        </section>
      </div>
      <div class="onboarding-actions onboarding-actions--footer">
        <div class="onboarding-actions__meta">
          <strong>Preferências prontas</strong>
          <span>Confirme o estilo inicial e o recorte mensal para seguir para os dados do perfil.</span>
        </div>
        <div class="onboarding-actions__group onboarding-actions__group--footer">
          <button class="ghost onboarding-btn onboarding-btn--secondary" type="button" (click)="back.emit()">Voltar</button>
          <button class="btn-primary onboarding-btn onboarding-btn--primary onboarding-btn--confirm" type="button" [disabled]="!selectedMode()" (click)="next.emit()">
            Continuar para dados básicos
          </button>
        </div>
      </div>
    </div>
  `
})
export class PreferencesStepComponent {
  readonly options = input.required<IntelligenceModeOption[]>();
  readonly selectedMode = input.required<IntelligenceMode | null>();
  readonly carryOverDay = input.required<number>();
  readonly carryOverDayOptions = input.required<number[]>();
  readonly canEditCarryOverDay = input.required<boolean>();

  readonly selectMode = output<IntelligenceMode>();
  readonly carryOverDayChange = output<number>();
  readonly back = output<void>();
  readonly next = output<void>();
}
