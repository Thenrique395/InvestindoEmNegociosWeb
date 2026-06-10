import { Component, EventEmitter, Input, Output } from '@angular/core';


@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [],
  template: `
    <div class="flex flex-col items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-6 py-6 text-center">
      <div class="grid h-12 w-12 place-items-center rounded-full bg-[var(--surface-3)] text-[var(--text-lg)]" aria-hidden="true">
        {{ icon }}
      </div>
      <div class="space-y-1">
        <p class="m-0 text-[var(--text-md)] font-semibold text-[var(--text)]">{{ title }}</p>
        <p class="m-0 text-[var(--text-sm)] text-[var(--text-muted)]">{{ description }}</p>
      </div>
      @if (ctaLabel) {
        <button
          type="button"
          class="btn-primary sm"
          (click)="action.emit()">
          {{ ctaLabel }}
        </button>
      }
    </div>
    `
})
export class EmptyStateComponent {
  @Input() title = 'Nenhum registro encontrado';
  @Input() description = 'Comece adicionando seu primeiro lançamento.';
  @Input() ctaLabel?: string;
  @Input() icon = '✨';

  @Output() action = new EventEmitter<void>();
}
