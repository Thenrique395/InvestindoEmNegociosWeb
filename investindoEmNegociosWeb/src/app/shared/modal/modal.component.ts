import { Component, computed, input, output } from '@angular/core';
import { BodyPortalDirective } from '../body-portal.directive';


type ModalSize = 'sm' | 'md' | 'lg' | 'xl';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [BodyPortalDirective],
  template: `
    @if (open()) {
      <div
        appBodyPortal
        class="fixed inset-0 z-[9999] flex items-center justify-center px-4 py-8"
        role="dialog"
        aria-modal="true"
        [attr.aria-label]="title()">
        <!-- backdrop -->
        <div
          class="absolute inset-0 backdrop-blur-sm"
        (click)="handleBackdropClick()"></div>
        <!-- modal card -->
        <section [class]="modalClass()">
          @if (eyebrow() || title() || subtitle() || showCloseButton()) {
            <header
              class="flex flex-none items-start justify-between gap-4 border-b border-[var(--border-inner)] px-[var(--modal-pad-x,var(--space-12))] py-[var(--space-10)]">
              <div class="min-w-0 space-y-1">
                @if (eyebrow()) {
                  <p class="m-0 text-xs font-bold uppercase tracking-widest text-[var(--text-tertiary)]">{{ eyebrow() }}</p>
                }
                @if (title()) {
                  <h2
                    class="m-0 text-lg font-semibold text-[var(--text)]">
                    {{ title() }}
                  </h2>
                }
                @if (subtitle()) {
                  <p
                    class="m-0 text-sm text-[var(--text-tertiary)]">
                    {{ subtitle() }}
                  </p>
                }
              </div>
              @if (showCloseButton()) {
                <button
                  type="button"
                  class="grid h-9 w-9 shrink-0 place-items-center rounded-[var(--radius-pill)] border border-[var(--border)] text-[var(--text-tertiary)] transition hover:bg-[var(--surface-sunken)] hover:text-[var(--text)]"
                  aria-label="Fechar modal"
                  (click)="close.emit()">
                  ✕
                </button>
              }
            </header>
          }
          <div class="min-h-0 flex-1 overflow-y-auto px-[var(--modal-pad-x,var(--space-12))] py-[var(--space-10)]">
            <ng-content></ng-content>
            <ng-content select="[modal-body]"></ng-content>
          </div>
          @if (hasFooter()) {
            <footer
              class="flex flex-none flex-wrap justify-end gap-[var(--space-6)] border-t border-[var(--border-inner)] bg-[var(--surface-subtle)] px-[var(--modal-pad-x,var(--space-12))] py-[var(--space-7)]">
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
  readonly eyebrow = input<string>('');
  readonly title = input<string>('');
  readonly subtitle = input<string>('');
  readonly size = input<ModalSize>('md');
  readonly hasFooter = input<boolean>(true);
  readonly closeOnBackdrop = input<boolean>(true);
  readonly showCloseButton = input<boolean>(true);

  readonly close = output<void>();

  readonly modalClass = computed(() => {
    const sizeClass = this.resolveSizeClass(this.size());
    // Três faixas (COMPONENTES.md §7): o card é flex column com altura máxima,
    // cabeçalho e rodapé são `flex-none` e só o corpo rola. Com `max-height` no
    // corpo em vez de aqui, um cabeçalho alto empurra o rodapé para fora da tela.
    return `
      relative flex w-full flex-col ${sizeClass}
      max-h-[88vh]
      rounded-[var(--radius-card)]
      border border-[var(--border)]
      bg-[var(--surface)]
      shadow-[var(--shadow-modal)]
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
