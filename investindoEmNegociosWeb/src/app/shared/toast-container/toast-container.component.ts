import { Component } from '@angular/core';
import { AsyncPipe, NgClass, NgFor } from '@angular/common';
import { UiFeedbackMessage, UiFeedbackService } from '../../ui-feedback.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [AsyncPipe, NgClass, NgFor],
  template: `
    <div
      class="pointer-events-none fixed right-4 top-4 z-[9999] grid w-[min(420px,calc(100vw-2rem))] gap-3"
      aria-live="polite"
      aria-atomic="false">
      <article
        *ngFor="let message of feedback.messages$ | async; trackBy: trackByMessage"
        class="pointer-events-auto rounded-2xl border px-4 py-3 shadow-[var(--shadow-md)] backdrop-blur"
        [ngClass]="toastClass(message.type)">
        <div class="flex items-start gap-3">
          <span class="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--surface-3)]" aria-hidden="true">
            {{ icon(message.type) }}
          </span>
          <div class="min-w-0 flex-1">
            <p class="m-0 text-sm font-semibold text-[var(--text)]">{{ title(message.type) }}</p>
            <p class="m-0 mt-1 text-sm text-[var(--text-muted)]">{{ message.text }}</p>
          </div>
          <button
            type="button"
            class="rounded-full px-2 py-1 text-sm text-[var(--text-muted)] transition hover:bg-[var(--surface-3)] hover:text-[var(--text)]"
            aria-label="Fechar mensagem"
            (click)="feedback.dismiss(message.id)">
            ×
          </button>
        </div>
      </article>
    </div>
  `
})
export class ToastContainerComponent {
  constructor(public readonly feedback: UiFeedbackService) {}

  trackByMessage(_: number, message: UiFeedbackMessage): number {
    return message.id;
  }

  icon(type: UiFeedbackMessage['type']): string {
    switch (type) {
      case 'success': return '✅';
      case 'error': return '⚠️';
      case 'warning': return '🔔';
      default: return 'ℹ️';
    }
  }

  title(type: UiFeedbackMessage['type']): string {
    switch (type) {
      case 'success': return 'Sucesso';
      case 'error': return 'Atenção';
      case 'warning': return 'Aviso';
      default: return 'Informação';
    }
  }

  toastClass(type: UiFeedbackMessage['type']): string {
    switch (type) {
      case 'success': return 'border-[var(--color-success-soft)] bg-[var(--surface)]';
      case 'error': return 'border-[var(--color-danger-soft)] bg-[var(--surface)]';
      case 'warning': return 'border-[var(--color-warning-soft)] bg-[var(--surface)]';
      default: return 'border-[var(--border)] bg-[var(--surface)]';
    }
  }
}
