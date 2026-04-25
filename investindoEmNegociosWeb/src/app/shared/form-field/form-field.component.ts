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
        <span>{{ label() }}</span>
        <small *ngIf="hint()" class="font-medium text-[var(--text-muted)]">{{ hint() }}</small>
      </span>

      <ng-content></ng-content>

      <span *ngIf="description() && !error()" class="text-xs font-medium text-[var(--text-muted)]">
        {{ description() }}
      </span>

      <span *ngIf="error()" [class]="messageClass()">
        {{ error() }}
      </span>
    </label>
  `
})
export class FormFieldComponent {
  readonly label = input.required<string>();
  readonly hint = input<string>('');
  readonly description = input<string>('');
  readonly error = input<string>('');
  readonly tone = input<FormFieldTone>('default');

  readonly messageClass = computed(() => {
    const tone = this.error() ? 'danger' : this.tone();
    if (tone === 'danger') return 'text-xs font-medium text-[var(--danger)]';
    if (tone === 'success') return 'text-xs font-medium text-[var(--success)]';
    return 'text-xs font-medium text-[var(--text-muted)]';
  });
}
