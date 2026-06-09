import { Component, computed, input } from '@angular/core';
import { NgClass } from '@angular/common';

type FormFieldTone = 'default' | 'danger' | 'success';

@Component({
  selector: 'app-form-field',
  standalone: true,
  imports: [NgClass],
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

    :host ::ng-deep input:focus,
    :host ::ng-deep select:focus,
    :host ::ng-deep textarea:focus {
      outline: 2px solid var(--color-primary);
      outline-offset: 2px;
    }

    :host.form-field--invalid ::ng-deep input,
    :host.form-field--invalid ::ng-deep select,
    :host.form-field--invalid ::ng-deep textarea {
      border-color: var(--color-danger);
      box-shadow: 0 0 0 3px var(--color-danger-weak);
    }

    :host.form-field--invalid ::ng-deep input:focus,
    :host.form-field--invalid ::ng-deep select:focus,
    :host.form-field--invalid ::ng-deep textarea:focus {
      border-color: var(--color-danger);
      box-shadow: 0 0 0 4px var(--color-danger-soft);
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
    <label class="grid gap-2 text-sm font-semibold text-[var(--color-text)]">
      <span class="flex items-center justify-between gap-2">
        <span class="form-field__label inline-flex items-center gap-1" [ngClass]="hasError() ? 'text-[var(--color-danger-text)]' : ''">
          {{ label() }}
          @if (required()) {
            <span class="text-[var(--color-danger-text)]" aria-hidden="true">*</span>
          }
        </span>
        @if (hint()) {
          <small class="form-field__hint">{{ hint() }}</small>
        }
      </span>
    
      <ng-content></ng-content>
    
      @if (descriptionToShow()) {
        <span [class]="messageClass()" [attr.role]="hasError() ? 'alert' : null">
          {{ descriptionToShow() }}
        </span>
      }
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
  readonly animate = input<boolean>(true);
  readonly tone = input<FormFieldTone>('default');

  readonly hasError = computed(() => !!this.error()?.trim());
  readonly shouldAnimate = computed(() => this.hasError() && this.submitted() && this.animate());
  readonly descriptionToShow = computed(() => this.error() || this.description());

  readonly messageClass = computed(() => {
    const tone = this.hasError() ? 'danger' : this.tone();
    if (tone === 'danger') return 'form-field__message form-field__message--danger';
    if (tone === 'success') return 'form-field__message form-field__message--success';
    return 'form-field__message';
  });
}
