import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';


@Component({
  selector: 'app-empty-state',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  template: `
    <div class="flex flex-col items-center gap-[var(--space-6)] rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] px-6 py-[52px] text-center">
      <div class="grid h-[52px] w-[52px] place-items-center rounded-[var(--radius-card)] bg-[var(--surface-inset)] text-[var(--fs-section)] text-[var(--text-muted)]" aria-hidden="true">
        {{ icon() }}
      </div>
      <div class="space-y-1">
        <p class="m-0 text-[var(--fs-card-title)] font-semibold text-[var(--text)]">{{ title() }}</p>
        <p class="m-0 max-w-[44ch] text-[var(--fs-body)] text-[var(--text-tertiary)]">{{ description() }}</p>
      </div>
      @if (ctaLabel()) {
        <button
          type="button"
          class="btn-primary sm"
          (click)="action.emit()">
          {{ ctaLabel() }}
        </button>
      }
    </div>
    `
})
export class EmptyStateComponent {
  readonly title = input('Nenhum registro encontrado');
  readonly description = input('Comece adicionando seu primeiro lançamento.');
  readonly ctaLabel = input<string | undefined>(undefined);
  readonly icon = input('✨');

  readonly action = output<void>();
}
