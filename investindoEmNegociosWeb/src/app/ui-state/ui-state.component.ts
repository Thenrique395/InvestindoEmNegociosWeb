import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NgIf } from '@angular/common';

@Component({
  selector: 'app-ui-state',
  standalone: true,
  imports: [NgIf],
  template: `
    <div class="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-4 text-sm text-[var(--text)]">
      <div class="flex items-start gap-3">
        <div class="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--surface-3)]" aria-hidden="true">
          {{ iconToShow }}
        </div>
        <div class="min-w-0 flex-1 space-y-1">
          <p class="m-0 font-semibold">{{ titleToShow }}</p>
          <p *ngIf="description" class="m-0 text-[var(--text-muted)]">{{ description }}</p>
        </div>
        <button
          *ngIf="retryLabel"
          type="button"
          class="btn-ghost sm"
          (click)="retry.emit()">
          {{ retryLabel }}
        </button>
      </div>
    </div>
  `
})
export class UiStateComponent {
  @Input() type: 'loading' | 'error' | 'info' = 'info';
  @Input() title?: string;
  @Input() description?: string;
  @Input() retryLabel?: string;

  @Output() retry = new EventEmitter<void>();

  get iconToShow(): string {
    if (this.type === 'loading') return '⏳';
    if (this.type === 'error') return '⚠️';
    return 'ℹ️';
  }

  get titleToShow(): string {
    if (this.title) return this.title;
    if (this.type === 'loading') return 'Carregando informações...';
    if (this.type === 'error') return 'Não foi possível carregar os dados.';
    return 'Informação';
  }
}
