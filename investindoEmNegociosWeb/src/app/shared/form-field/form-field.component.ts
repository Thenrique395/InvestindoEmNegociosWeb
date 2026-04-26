import { Component, computed, input } from '@angular/core';
import { NgIf } from '@angular/common';

type FormFieldTone = 'default' | 'danger' | 'success';

@Component({
  selector: 'app-form-field',
  standalone: true,
  imports: [NgIf],
  template: `
    <label class="grid gap-2 text-sm font-semibold text-[var(--text)]">
      <span class="flex items-center justify-between gap-2">
        <span class="inline-flex items-center gap-1">
          {{ label() }}
          <span *ngIf="required()" class="text-[var(--danger)]" aria-hidden="true">*</span>
        </span>
        <small *ngIf="hint()" class="font-medium text-[var(--text-muted)]">{{ hint() }}</small>
      </span>

      <ng-content></ng-content>

      <span *ngIf="descriptionToShow()" [class]="messageClass()" [attr.role]="error() ? 'alert' : null">
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
  readonly tone = input<FormFieldTone>('default');

  readonly descriptionToShow = computed(() => this.error() || this.description());

  readonly messageClass = computed(() => {
    const tone = this.error() ? 'danger' : this.tone();
    if (tone === 'danger') return 'text-xs font-medium text-[var(--danger)]';
    if (tone === 'success') return 'text-xs font-medium text-[var(--success)]';
    return 'text-xs font-medium text-[var(--text-muted)]';
  });
}
