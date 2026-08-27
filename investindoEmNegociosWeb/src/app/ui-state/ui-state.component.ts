import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';


@Component({
  selector: 'app-ui-state',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  template: `
    <div class="rounded-2xl border border-[var(--border)] bg-[var(--surface-sunken)] px-4 py-4 text-sm text-[var(--text)]">
      <div class="flex items-start gap-3">
        <div class="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--surface-inset)]" aria-hidden="true">
          {{ iconToShow() }}
        </div>
        <div class="min-w-0 flex-1 space-y-1">
          <p class="m-0 font-semibold">{{ titleToShow() }}</p>
          @if (description()) {
            <p class="m-0 text-[var(--text-tertiary)]">{{ description() }}</p>
          }
        </div>
        @if (retryLabel()) {
          <button
            type="button"
            class="btn-ghost sm"
            (click)="retry.emit()">
            {{ retryLabel() }}
          </button>
        }
      </div>
    </div>
    `
})
export class UiStateComponent {
  readonly type = input<'loading' | 'error' | 'info'>('info');
  readonly title = input<string | undefined>(undefined);
  readonly description = input<string | undefined>(undefined);
  readonly retryLabel = input<string | undefined>(undefined);

  readonly retry = output<void>();

  readonly iconToShow = computed(() => {
    if (this.type() === 'loading') return '⏳';
    if (this.type() === 'error') return '⚠️';
    return 'ℹ️';
  });

  readonly titleToShow = computed(() => {
    const informado = this.title();
    if (informado) return informado;
    if (this.type() === 'loading') return 'Carregando informações...';
    if (this.type() === 'error') return 'Não foi possível carregar os dados.';
    return 'Informação';
  });
}
