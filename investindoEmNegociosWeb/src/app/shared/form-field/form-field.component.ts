import { Component, computed, input } from '@angular/core';
import { NgClass, NgIf } from '@angular/common';

type FormFieldTone = 'default' | 'danger' | 'success';

@Component({
  selector: 'app-form-field',
  standalone: true,
  imports: [NgClass, NgIf],
  host: {
    '[class.form-field--invalid]': 'hasError()',
    '[class.form-field--animate]': 'shouldAnimate()'
  },
  styles: [`
    :host {
      display: block;
    }

    :host(.form-field--animate) {
      animation: form-field-shake 180ms ease-in-out;
    }

    :host(.form-field--invalid) ::ng-deep input,
    :host(.form-field--invalid) ::ng-deep select,
    :host(.form-field--invalid) ::ng-deep textarea {
      border-color: var(--danger) !important;
      box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.14);
      outline: none;
    }

    :host(.form-field--invalid) ::ng-deep input:focus,
    :host(.form-field--invalid) ::ng-deep select:focus,
    :host(.form-field--invalid) ::ng-deep textarea:focus {
      border-color: var(--danger) !important;
      box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.2);
    }

    @keyframes form-field-shake {
      0%, 100% { transform: translateX(0); }
      25% { transform: translateX(-3px); }
      50% { transform: translateX(3px); }
      75% { transform: translateX(-2px); }
    }

    @media (prefers-reduced-motion: reduce) {
      :host(.form-field--animate) {
        animation: none;
      }
    }
  `],
  template: `
    <label class="grid gap-2 text-sm font-semibold text-[var(--text)]">
      <span class="flex items-center justify-between gap-2">
        <span class="inline-flex items-center gap-1" [ngClass]="hasError() ? 'text-[var(--danger)]' : ''">
          {{ label() }}
          <span *ngIf="required()" class="text-[var(--danger)]" aria-hidden="true">*</span>
        </span>
        <small *ngIf="hint()" class="font-medium text-[var(--text-muted)]">{{ hint() }}</small>
      </span>

      <ng-content></ng-content>

      <span *ngIf="descriptionToShow()" [class]="messageClass()" [attr.role]="hasError() ? 'alert' : null">
        {{ descriptionToShow() }}
      </span>
    </label>
  `
})
export class FormFieldComponent {
  readonly label = input.required<string>();
  readonly hint = input<string>('');
  readonly description = input<string>('');
  readonly error = input<string>('');
  readonly required = input<boolean>(false);
  readonly submitted = input<boolean>(false);
  readonly tone = input<FormFieldTone>('default');

  readonly hasError = computed(() => !!this.error()?.trim());
  readonly shouldAnimate = computed(() => this.hasError() && this.submitted());
  readonly descriptionToShow = computed(() => this.error() || this.description());

  readonly messageClass = computed(() => {
    const tone = this.hasError() ? 'danger' : this.tone();
    if (tone === 'danger') return 'text-xs font-medium text-[var(--danger)]';
    if (tone === 'success') return 'text-xs font-medium text-[var(--success)]';
    return 'text-xs font-medium text-[var(--text-muted)]';
  });
}
