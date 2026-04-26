import { Component, computed, input, output } from '@angular/core';
import { NgIf } from '@angular/common';

type ModalSize = 'sm' | 'md' | 'lg' | 'xl';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [NgIf],
  template: `
    <div
      *ngIf="open()"
      class="fixed inset-0 z-[9999] flex items-center justify-center px-4 py-8"
      role="dialog"
      aria-modal="true"
      [attr.aria-label]="title()">
      <div class="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" (click)="handleBackdropClick()"></div>

      <section [class]="modalClass()">
        <header *ngIf="title() || subtitle() || showCloseButton()" class="flex items-start justify-between gap-4 border-b border-[var(--border)] px-6 py-4">
          <div class="min-w-0 space-y-1">
            <h2 *ngIf="title()" class="m-0 text-lg font-semibold text-[var(--text)]">
              {{ title() }}
            </h2>
            <p *ngIf="subtitle()" class="m-0 text-sm text-[var(--text-muted)]">
              {{ subtitle() }}
            </p>
          </div>

          <button
            *ngIf="showCloseButton()"
            type="button"
            class="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[var(--border)] text-[var(--text-muted)] transition hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
            aria-label="Fechar modal"
            (click)="close.emit()">
            ✕
          </button>
        </header>

        <div class="max-h-[calc(100vh-14rem)] overflow-y-auto px-6 py-4">
          <ng-content></ng-content>
          <ng-content select="[modal-body]"></ng-content>
        </div>

        <footer *ngIf="hasFooter()" class="flex flex-wrap justify-end gap-2 border-t border-[var(--border)] px-6 py-4">
          <ng-content select="[modal-footer]"></ng-content>
        </footer>
      </section>
    </div>
  `
})
export class ModalComponent {
  readonly open = input<boolean>(false);
  readonly title = input<string>('');
  readonly subtitle = input<string>('');
  readonly size = input<ModalSize>('md');
  readonly hasFooter = input<boolean>(true);
  readonly closeOnBackdrop = input<boolean>(true);
  readonly showCloseButton = input<boolean>(true);

  readonly close = output<void>();

  readonly modalClass = computed(() => {
    const sizeClass = this.resolveSizeClass(this.size());
    return `relative w-full ${sizeClass} rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-lg)]`;
  });

  handleBackdropClick(): void {
    if (this.closeOnBackdrop()) {
      this.close.emit();
    }
  }

  private resolveSizeClass(size: ModalSize): string {
    switch (size) {
      case 'sm': return 'max-w-md';
      case 'lg': return 'max-w-4xl';
      case 'xl': return 'max-w-6xl';
      default: return 'max-w-2xl';
    }
  }
}
