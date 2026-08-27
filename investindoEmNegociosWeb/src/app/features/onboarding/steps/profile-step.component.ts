import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { DatePickerComponent } from '../../../shared/date-picker/date-picker.component';
import { FormFieldComponent } from '../../../shared/form-field/form-field.component';
import { OnboardingProfileField, onboardingProfileFieldError } from '../../../core/onboarding.helpers';

/**
 * Passo 3 do onboarding: dados básicos do perfil. Presentacional — recebe o
 * FormGroup (fonte única da verdade, compartilhado com o pai) e emite as
 * interações de máscara/data e a submissão. Campos padronizados no app-form-field.
 */
@Component({
  selector: 'app-onboarding-profile-step',
  standalone: true,
  imports: [ReactiveFormsModule, DatePickerComponent, FormFieldComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [':host { display: contents; }'],
  template: `
    <form class="onboarding-choice-block" [formGroup]="form()" (ngSubmit)="submit.emit()">
      <section class="onboarding-block">
        <div class="onboarding-form-section">
          <p class="onboarding-form-section__title">Identificação</p>
          <div class="onboarding-form-grid onboarding-form-grid--identificacao">
            <app-form-field
              class="onboarding-field--full"
              label="Nome completo"
              [required]="true"
              [error]="controlError('fullName') || ''">
              <input class="onboarding-control" type="text" formControlName="fullName" placeholder="Seu nome completo" />
            </app-form-field>
            @if (hasDocument()) {
              <app-form-field label="CPF" hint="Não editável">
                <input class="onboarding-control" type="text" formControlName="document" [readonly]="true" />
              </app-form-field>
            } @else {
              <app-form-field
                label="CPF"
                [required]="true"
                [error]="controlError('document') || ''">
                <input class="onboarding-control" type="text" inputmode="numeric" formControlName="document" placeholder="000.000.000-00" (input)="cpfInput.emit($event)" />
              </app-form-field>
            }
            <app-form-field
              label="Telefone"
              [required]="true"
              [error]="controlError('phone') || ''">
              <input class="onboarding-control" type="tel" inputmode="numeric" formControlName="phone" placeholder="(81) 91234-1234" (input)="phoneInput.emit($event)" />
            </app-form-field>
            <app-form-field
              label="Data de nascimento"
              [required]="true"
              [error]="controlError('birthDate') || ''">
              <app-date-picker
                class="onboarding-control"
                format="iso"
                [value]="form().get('birthDate')?.value || ''"
                [min]="minBirthDate()"
                [max]="maxBirthDate()"
                [invalid]="!!controlError('birthDate')"
                ariaLabel="Data de nascimento"
                (valueChange)="birthDateChange.emit($event)" />
            </app-form-field>
          </div>
        </div>
        <div class="onboarding-form-section">
          <p class="onboarding-form-section__title">Localização</p>
          <div class="onboarding-form-grid onboarding-form-grid--location">
            <app-form-field
              label="Cidade"
              [required]="true"
              [error]="controlError('city') || ''">
              <input class="onboarding-control" type="text" formControlName="city" placeholder="Ex: Recife" />
            </app-form-field>
            <app-form-field
              label="Estado (UF)"
              [required]="true"
              [error]="controlError('state') || ''">
              <input class="onboarding-control" type="text" formControlName="state" placeholder="Ex: PE" maxlength="2" />
            </app-form-field>
            <app-form-field
              label="País"
              [required]="true"
              [error]="controlError('country') || ''">
              <input class="onboarding-control" type="text" formControlName="country" placeholder="Ex: Brasil" />
            </app-form-field>
          </div>
        </div>
      </section>

      <div class="onboarding-footer">
        <div class="onboarding-footer__meta">
          <strong>Isso personaliza sua conta</strong>
          <span>Seus dados ficam no perfil e podem ser editados quando quiser.</span>
        </div>
        <div class="onboarding-footer__actions">
          <button class="onboarding-back" type="button" (click)="back.emit()">Voltar</button>
          <button class="onboarding-cta" type="submit" [disabled]="loading()">
            {{ loading() ? 'Salvando…' : 'Salvar e continuar' }}
          </button>
        </div>
      </div>
    </form>
  `
})
export class ProfileStepComponent {
  readonly form = input.required<FormGroup>();
  readonly hasDocument = input.required<boolean>();
  readonly minBirthDate = input.required<string>();
  readonly maxBirthDate = input.required<string>();
  readonly loading = input.required<boolean>();

  readonly cpfInput = output<Event>();
  readonly phoneInput = output<Event>();
  readonly birthDateChange = output<string>();
  readonly back = output<void>();
  readonly submit = output<void>();

  controlError(control: OnboardingProfileField): string | null {
    return onboardingProfileFieldError(control, this.form().get(control));
  }
}
