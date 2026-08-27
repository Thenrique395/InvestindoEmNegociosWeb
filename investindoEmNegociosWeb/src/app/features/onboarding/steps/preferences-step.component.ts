import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IntelligenceMode, IntelligenceModeOption } from '../onboarding.types';

/**
 * Passo 2 do onboarding: preferências (estilo dos insights + dia de início da
 * competência mensal). Presentacional — a persistência de draft e o avanço
 * ficam no OnboardingComponent.
 *
 * Mesma gramática do passo 1: cards de escolha, explicação da opção escolhida
 * numa faixa abaixo e rodapé com a ação principal.
 */
@Component({
  selector: 'app-onboarding-preferences-step',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [':host { display: contents; }'],
  template: `
    <div class="onboarding-choice-block">
      <div class="onboarding-choice-grid onboarding-choice-grid--three">
        @for (mode of options(); track mode.id) {
          <label
            class="onboarding-choice"
            [class.onboarding-choice--selected]="selectedMode() === mode.id">
            <input
              class="sr-only"
              type="radio"
              name="intelligenceMode"
              [value]="mode.id"
              [ngModel]="selectedMode()"
              (ngModelChange)="selectMode.emit($event)"
              [ngModelOptions]="{ standalone: true }" />

            <span class="onboarding-choice__top">
              <span class="onboarding-choice__icon" aria-hidden="true">
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
                      <path d="M12 3.4 5.4 6.2v5.2c0 4.1 2.7 7.8 6.6 9.2 3.9-1.4 6.6-5.1 6.6-9.2V6.2Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" />
                      <path d="M9.2 12h5.6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
                    </svg>
                  }
                  @case ('accelerate') {
                    <svg viewBox="0 0 24 24" role="presentation" focusable="false">
                      <path d="M13.4 3.2 6.2 13h4.6l-.9 7.8L17.8 11h-4.6z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" />
                    </svg>
                  }
                }
              </span>
              <span class="onboarding-choice__radio" aria-hidden="true"></span>
            </span>

            <strong class="onboarding-choice__title">{{ mode.title }}</strong>
            <span class="onboarding-choice__desc">{{ mode.description }}</span>
          </label>
        }
      </div>

      @if (selectedOption(); as mode) {
        <p class="onboarding-insight">
          <svg class="onboarding-insight__icon" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.7" />
            <path d="M12 11v5.2M12 7.9v.01" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" />
          </svg>
          <span>{{ mode.tooltip }}</span>
        </p>
      }

      <section class="onboarding-block onboarding-block--row">
        <div class="onboarding-block__head">
          <strong>Dia de início da competência</strong>
          @if (canEditCarryOverDay()) {
            <span>Defina o recorte mensal que melhor acompanha sua rotina.</span>
          } @else {
            <span>No seu plano, a competência usa o mês calendário padrão.</span>
          }
        </div>

        @if (canEditCarryOverDay()) {
          <label class="onboarding-field onboarding-field--compact">
            <select
              [ngModel]="carryOverDay()"
              (ngModelChange)="carryOverDayChange.emit($event)"
              [ngModelOptions]="{ standalone: true }"
              aria-label="Dia de início da competência">
              @for (day of carryOverDayOptions(); track day) {
                <option [ngValue]="day">Dia {{ day }}</option>
              }
            </select>
            <small>Ex.: dia 10 considera a competência de 10 até o dia 9 do mês seguinte.</small>
          </label>
        } @else {
          <p class="onboarding-block__note">
            O sistema vai considerar <strong>Dia 1</strong> como início da competência, usando o mês calendário padrão.
          </p>
        }
      </section>

      <div class="onboarding-footer">
        <div class="onboarding-footer__meta">
          <strong>Isso ajusta o tom</strong>
          <span>O estilo define quanto o sistema sugere e o recorte mensal organiza seus totais.</span>
        </div>
        <div class="onboarding-footer__actions">
          <button class="onboarding-back" type="button" (click)="back.emit()">Voltar</button>
          <button class="onboarding-cta" type="button" [disabled]="!selectedMode()" (click)="next.emit()">
            Continuar
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

  readonly selectedOption = computed(() => this.options().find((o) => o.id === this.selectedMode()) ?? null);
}
