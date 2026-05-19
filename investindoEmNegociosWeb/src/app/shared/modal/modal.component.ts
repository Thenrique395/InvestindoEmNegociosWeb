import { Component, computed, input, output } from '@angular/core';


type ModalSize = 'sm' | 'md' | 'lg' | 'xl';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [],
  template: `
    @if (open()) {
      <div
        class="fixed inset-0 z-[9999] flex items-center justify-center px-4 py-8"
        role="dialog"
        aria-modal="true"
        [attr.aria-label]="title()">
        <!-- backdrop -->
        <div
          class="absolute inset-0 bg-[color:rgba(0,0,0,0.5)] backdrop-blur-sm"
        (click)="handleBackdropClick()"></div>
        <!-- modal card -->
        <section [class]="modalClass()">
          @if (title() || subtitle() || showCloseButton()) {
            <header
              class="flex items-start justify-between gap-4 border-b border-[var(--color-border)] px-[var(--spacing-4)] py-[var(--spacing-3)]">
              <div class="min-w-0 space-y-1">
                @if (title()) {
                  <h2
                    class="m-0 text-lg font-semibold text-[var(--color-text)]">
                    {{ title() }}
                  </h2>
                }
                @if (subtitle()) {
                  <p
                    class="m-0 text-sm text-[var(--color-text-muted)]">
                    {{ subtitle() }}
                  </p>
                }
              </div>
              @if (showCloseButton()) {
                <button
                  type="button"
                  class="grid h-9 w-9 shrink-0 place-items-center rounded-[var(--radius-pill)] border border-[var(--color-border)] text-[var(--color-text-muted)] transition hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text)]"
                  aria-label="Fechar modal"
                  (click)="close.emit()">
                  ✕
                </button>
              }
            </header>
          }
          <div class="max-h-[calc(100vh-14rem)] overflow-y-auto px-[var(--spacing-4)] py-[var(--spacing-3)]">
            <ng-content></ng-content>
            <ng-content select="[modal-body]"></ng-content>
          </div>
          @if (hasFooter()) {
            <footer
              class="flex flex-wrap justify-end gap-[var(--spacing-2)] border-t border-[var(--color-border)] px-[var(--spacing-4)] py-[var(--spacing-3)]">
              <ng-content select="[modal-footer]"></ng-content>
            </footer>
          }
        </section>
      </div>
    }
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
    return `
      relative w-full ${sizeClass}
      rounded-[var(--radius-xl)]
      border border-[var(--color-border)]
      bg-[var(--color-surface)]
      shadow-[var(--shadow-elevation-lg)]
    `;
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
