import { AsyncPipe, NgClass, NgIf } from '@angular/common';
import { Component } from '@angular/core';
import { ConfirmDialogService, ConfirmDialogTone } from './confirm-dialog.service';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [AsyncPipe, NgClass, NgIf],
  template: `
    <ng-container *ngIf="service.state$ | async as state">
      <div
        *ngIf="state.isOpen"
        class="fixed inset-0 z-[10000] flex items-center justify-center px-4 py-8"
        role="dialog"
        aria-modal="true"
        [attr.aria-label]="state.title">
        <div class="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" (click)="cancel()"></div>

        <section class="relative w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-modal)]">
          <div class="flex items-start gap-3">
            <div [class]="iconClass(state.tone)" aria-hidden="true">
              {{ icon(state.tone) }}
            </div>

            <div class="min-w-0 flex-1">
              <h2 class="m-0 text-lg font-semibold text-[var(--text)]">
                {{ state.title }}
              </h2>
              <p class="m-0 mt-2 text-sm leading-6 text-[var(--text-tertiary)]">
                {{ state.message }}
              </p>
            </div>
          </div>

          <div class="mt-6 flex flex-wrap justify-end gap-2">
            <button type="button" class="btn-ghost sm" (click)="cancel()">
              {{ state.cancelLabel }}
            </button>

            <button
              type="button"
              class="sm"
              [ngClass]="state.tone === 'danger' ? 'btn-danger' : 'btn-primary'"
              (click)="confirm()">
              {{ state.confirmLabel }}
            </button>
          </div>
        </section>
      </div>
    </ng-container>
  `
})
export class ConfirmDialogComponent {
  constructor(public readonly service: ConfirmDialogService) {}

  confirm(): void {
    this.service.accept();
  }

  cancel(): void {
    this.service.cancel();
  }

  icon(tone: ConfirmDialogTone | undefined): string {
    if (tone === 'danger') return '⚠️';
    if (tone === 'warning') return '🔔';
    return '✓';
  }

  iconClass(tone: ConfirmDialogTone | undefined): string {
    const base = 'grid h-10 w-10 shrink-0 place-items-center rounded-full text-lg';
    if (tone === 'danger') return `${base} bg-[var(--expense-tint)] text-[var(--expense-text)]`;
    if (tone === 'warning') return `${base} bg-[var(--warning-tint)] text-[var(--warning-text)]`;
    return `${base} bg-[var(--income-tint)] text-[var(--income-text)]`;
  }
}
