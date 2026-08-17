import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { FormsModule } from '@angular/forms';

export type BulkActionTone = 'primary' | 'ghost' | 'danger';

export interface BulkAction {
  label: string;
  tone: BulkActionTone;
  run: () => void;
  loading?: boolean;
  loadingLabel?: string;
  disabled?: boolean;
}

export interface BulkAccountOption {
  id?: string;
  name: string;
}

/**
 * Barra de ações em massa compartilhada por Receitas e Despesas.
 * O resumo, o seletor de conta e as ações vêm por configuração;
 * as diferenças entre as telas ficam no array `actions`.
 */
@Component({
  selector: 'app-bulk-action-bar',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="tx-bulk">
      <div class="tx-bulk__meta">
        <span>{{ summary() }}</span>
        @if (accountLabel()) {
          <label class="tx-bulk__account">
            <span>{{ accountLabel() }}</span>
            <select [ngModel]="account()" (ngModelChange)="account.set($event)">
              @for (option of accounts(); track option.id) {
                <option [ngValue]="option.id">{{ option.name }}</option>
              }
            </select>
          </label>
        }
      </div>
      <div class="tx-bulk__actions">
        @for (action of actions(); track action.label) {
          <button
            type="button"
            [class]="'tx-bulk__button tx-bulk__button--' + action.tone"
            [disabled]="action.disabled || action.loading"
            (click)="action.run()">
            {{ action.loading ? (action.loadingLabel || 'Processando...') : action.label }}
          </button>
        }
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }

    .tx-bulk {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 1rem 1.1rem;
      border: 1px solid var(--border);
      border-radius: var(--radius-panel);
      background: color-mix(in srgb, var(--surface-sunken) 78%, white);
    }

    .tx-bulk__meta {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 1rem;
      color: var(--text-secondary);
      font-size: var(--fs-body);
    }

    .tx-bulk__account {
      display: inline-flex;
      align-items: center;
      gap: 0.65rem;
    }

    .tx-bulk__account select {
      min-height: 38px;
      padding: 0 0.85rem;
      border: 1px solid var(--border);
      border-radius: var(--radius-control);
      background-color: var(--surface);
      color: var(--text);
      font-size: var(--fs-meta);
    }

    .tx-bulk__actions {
      display: inline-flex;
      flex-wrap: wrap;
      gap: 0.65rem;
    }

    .tx-bulk__button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 44px;
      padding: 0.7rem 1.1rem;
      border: 1px solid var(--border);
      border-radius: var(--radius-pill);
      font-size: var(--fs-body);
      font-weight: var(--fw-semibold);
      letter-spacing: var(--ls-tight);
      transition:
        transform 160ms ease,
        border-color 160ms ease,
        background 160ms ease,
        box-shadow 160ms ease,
        color 160ms ease,
        opacity 160ms ease;
    }

    .tx-bulk__button:hover:not(:disabled) {
      transform: translateY(-1px);
    }

    .tx-bulk__button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .tx-bulk__button--primary {
      border-color: color-mix(in srgb, var(--primary) 16%, transparent);
      background: linear-gradient(
        135deg,
        color-mix(in srgb, var(--primary) 92%, white),
        color-mix(in srgb, var(--primary) 76%, black)
      );
      color: white;
      box-shadow: 0 12px 26px color-mix(in srgb, var(--primary) 18%, transparent);
    }

    .tx-bulk__button--ghost {
      background: color-mix(in srgb, var(--surface) 90%, white);
      color: var(--text);
    }

    .tx-bulk__button--ghost:hover:not(:disabled) {
      border-color: color-mix(in srgb, var(--primary) 22%, transparent);
      background: color-mix(in srgb, var(--surface) 96%, white);
    }

    .tx-bulk__button--danger {
      border-color: color-mix(in srgb, var(--expense) 18%, transparent);
      background: color-mix(in srgb, var(--surface) 94%, white);
      color: var(--expense-text);
    }

    .tx-bulk__button--danger:hover:not(:disabled) {
      border-color: color-mix(in srgb, var(--expense) 30%, transparent);
      background: color-mix(in srgb, var(--expense) 8%, white);
    }
  `]
})
export class BulkActionBarComponent {
  readonly summary = input.required<string>();
  readonly actions = input.required<BulkAction[]>();
  /** Rótulo do seletor de conta; vazio esconde o seletor. */
  readonly accountLabel = input<string>('');
  readonly accounts = input<BulkAccountOption[]>([]);
  readonly account = model<string | null>(null);
}
