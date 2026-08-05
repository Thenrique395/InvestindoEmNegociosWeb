import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { BodyPortalDirective } from '../body-portal.directive';

/**
 * Chrome compartilhado de diálogo de confirmação (overlay + card + cabeçalho +
 * área de ações). O conteúdo (mensagem) e os botões vêm por projeção; use as
 * classes globais .btn-ghost / .btn-danger / .btn-primary nos botões de ação.
 */
@Component({
  selector: 'app-confirm-sheet',
  standalone: true,
  imports: [BodyPortalDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (open()) {
      <div appBodyPortal class="confirm-sheet" role="dialog" aria-modal="true" [attr.aria-label]="title() || eyebrow()">
        <div class="confirm-sheet__backdrop" (click)="dismiss.emit()"></div>
        <div class="confirm-sheet__dialog">
          <div class="confirm-sheet__head">
            <div class="confirm-sheet__copy">
              <p class="confirm-sheet__eyebrow">{{ eyebrow() }}</p>
              @if (title()) {
                <h3 class="confirm-sheet__title">{{ title() }}</h3>
              }
              <div class="confirm-sheet__text">
                <ng-content></ng-content>
              </div>
            </div>
            <button
              type="button"
              class="confirm-sheet__close"
              aria-label="Fechar"
              (click)="dismiss.emit()">
              <svg viewBox="0 0 24 24" focusable="false" role="presentation" width="18" height="18">
                <path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
              </svg>
            </button>
          </div>
          <div class="confirm-sheet__actions">
            <ng-content select="[sheet-actions]"></ng-content>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .confirm-sheet {
      position: fixed;
      inset: 0;
      z-index: 50;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem 1rem;
    }

    .confirm-sheet__backdrop {
      position: absolute;
      inset: 0;
      background: transparent;
      backdrop-filter: blur(6px);
    }

    .confirm-sheet__dialog {
      position: relative;
      inline-size: min(100%, 520px);
      display: grid;
      gap: 1.4rem;
      padding: 1.7rem;
      border: 1px solid var(--border);
      border-radius: var(--radius-2xl);
      background: var(--surface);
      box-shadow: var(--shadow-lg);
    }

    .confirm-sheet__head {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
    }

    .confirm-sheet__copy {
      display: grid;
      gap: 0.5rem;
      min-width: 0;
    }

    .confirm-sheet__eyebrow {
      margin: 0;
      color: var(--text-muted);
      font-size: var(--font-size-caption);
      font-weight: var(--font-weight-bold);
      letter-spacing: var(--letter-spacing-eyebrow);
      text-transform: uppercase;
    }

    .confirm-sheet__title {
      margin: 0;
      color: var(--text);
      font-size: var(--font-size-title);
      font-weight: var(--font-weight-bold);
    }

    .confirm-sheet__text {
      color: var(--text-secondary);
      font-size: var(--font-size-body-sm);
      line-height: var(--line-height-body);
    }

    .confirm-sheet__text ::ng-deep p {
      margin: 0;
    }

    .confirm-sheet__close {
      display: inline-flex;
      flex: none;
      align-items: center;
      justify-content: center;
      inline-size: 42px;
      block-size: 42px;
      border: 1px solid var(--border);
      border-radius: var(--radius-pill);
      color: var(--text-muted);
      cursor: pointer;
      transition: border-color 160ms ease, color 160ms ease, background-color 160ms ease;
    }

    .confirm-sheet__close:hover {
      border-color: var(--border-strong);
      color: var(--text);
      background: var(--surface-2);
    }

    .confirm-sheet__actions {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: 0.75rem;
    }
  `]
})
export class ConfirmSheetComponent {
  readonly open = input.required<boolean>();
  readonly eyebrow = input.required<string>();
  readonly title = input<string>('');

  readonly dismiss = output<void>();
}
