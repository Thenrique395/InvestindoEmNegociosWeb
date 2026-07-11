import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { AppCurrencyPipe } from '../../../../shared/app-currency.pipe';
import { StatusBadgeComponent } from '../../../../shared/status-badge/status-badge.component';
import { AccountResponse } from '../../models/account.models';
import { AccountActivity, accountTypeLabel } from '../../../../contas/accounts-overview.model';
import { formatLocaleDateFromIso } from '../../../../utils/locale-utils';

/**
 * Cartão de uma conta financeira. Consolida saldo, status, conta principal e
 * atividade do período (entradas/saídas/movimentações), com ações rápidas.
 * Reutilizável na lista de contas e, futuramente, em resumos do dashboard.
 */
@Component({
  selector: 'app-account-card',
  standalone: true,
  imports: [AppCurrencyPipe, StatusBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="ac" [class.ac--primary]="isPrimary()" [class.ac--negative]="isNegative()" [class.ac--inactive]="!account().isActive">
      <header class="ac__head">
        <span class="ac__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" role="presentation" focusable="false">
            <path d="M3 9l9-6 9 6v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" />
          </svg>
        </span>
        <div class="ac__title">
          <h3 class="ac__name">{{ account().name }}</h3>
          <p class="ac__type">{{ typeLabel() }}</p>
        </div>
        <div class="ac__badges">
          @if (isPrimary()) {
            <app-status-badge tone="info" size="sm" label="Principal" [dot]="true" />
          }
          @if (account().currency !== 'BRL') {
            <app-status-badge tone="muted" size="sm" [label]="account().currency" />
          }
          <app-status-badge [tone]="account().isActive ? 'success' : 'muted'" size="sm" [label]="account().isActive ? 'Ativa' : 'Inativa'" />
        </div>
      </header>

      <div class="ac__balance">
        <span class="ac__balance-label">Saldo atual</span>
        <strong class="ac__balance-value" [attr.aria-label]="balanceAria()">{{ account().currentBalance | appCurrency:account().currency }}</strong>
        @if (isNegative()) {
          <span class="ac__balance-hint">Saldo negativo — revise lançamentos ou faça um aporte.</span>
        }
      </div>

      @if (activity(); as act) {
        <dl class="ac__activity">
          <div class="ac__activity-item">
            <dt>Entradas</dt>
            <dd class="ac__in">{{ act.income | appCurrency:account().currency }}</dd>
          </div>
          <div class="ac__activity-item">
            <dt>Saídas</dt>
            <dd class="ac__out">{{ act.expense | appCurrency:account().currency }}</dd>
          </div>
          <div class="ac__activity-item">
            <dt>Movimentações</dt>
            <dd>{{ act.movementCount }}</dd>
          </div>
          <div class="ac__activity-item">
            <dt>Última</dt>
            <dd>{{ lastMovementLabel() }}</dd>
          </div>
        </dl>
      }

      <footer class="ac__actions">
        <button type="button" class="ac__action ac__action--primary" (click)="viewStatement.emit(account())">Extrato</button>
        @if (canManage()) {
          @if (canTransfer()) {
            <button type="button" class="ac__action" (click)="transfer.emit(account())">Transferir</button>
          }
          @if (canSetPrimary() && !isPrimary() && account().isActive) {
            <button type="button" class="ac__action" (click)="setPrimary.emit(account())">Tornar principal</button>
          }
          <button type="button" class="ac__action" (click)="edit.emit(account())" [attr.aria-label]="'Editar conta ' + account().name">Editar</button>
          <button type="button" class="ac__action ac__action--danger" (click)="remove.emit(account())" [attr.aria-label]="'Remover conta ' + account().name">Remover</button>
        }
      </footer>
    </article>
  `,
  styles: `
    :host { display: block; height: 100%; }
    .ac {
      display: grid;
      gap: 0.85rem;
      height: 100%;
      padding: 1.1rem 1.15rem;
      border: 1px solid var(--border);
      border-radius: var(--radius-xl);
      background: var(--surface);
      box-shadow: var(--shadow-elevation-sm);
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
    }
    .ac--primary { border-color: var(--color-info-soft); }
    .ac--negative { border-color: var(--color-danger-soft); }
    .ac--inactive { opacity: 0.82; }

    .ac__head { display: grid; grid-template-columns: auto minmax(0, 1fr); align-items: start; gap: 0.7rem; }
    .ac__icon {
      display: grid; place-items: center; width: 38px; height: 38px;
      border-radius: 12px; background: var(--surface-2); color: var(--text-muted);
    }
    .ac__icon svg { width: 20px; height: 20px; }
    .ac__title { min-width: 0; }
    .ac__name { margin: 0; font-size: var(--font-size-body, 0.95rem); font-weight: 700; color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .ac__type { margin: 2px 0 0; font-size: var(--text-xs, 0.72rem); color: var(--text-muted); }
    .ac__badges { grid-column: 1 / -1; display: flex; flex-wrap: wrap; gap: 6px; }

    .ac__balance { display: grid; gap: 2px; }
    .ac__balance-label { font-size: var(--text-xs, 0.68rem); text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); }
    .ac__balance-value { font-size: 1.5rem; font-weight: 700; color: var(--text); }
    .ac--negative .ac__balance-value { color: var(--color-danger-text); }
    .ac__balance-hint { font-size: var(--text-xs, 0.72rem); color: var(--color-danger-text); }

    .ac__activity {
      display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.55rem 0.9rem; margin: 0;
      padding: 0.7rem 0.8rem; border-radius: var(--radius-lg, 12px); background: var(--surface-2);
    }
    .ac__activity-item { display: grid; gap: 1px; min-width: 0; }
    .ac__activity dt { font-size: var(--text-xs, 0.68rem); color: var(--text-muted); }
    .ac__activity dd { margin: 0; font-size: var(--text-sm, 0.82rem); font-weight: 600; color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .ac__in { color: var(--success-text, var(--success)); }
    .ac__out { color: var(--danger-text, var(--danger)); }

    .ac__actions { display: flex; flex-wrap: wrap; gap: 6px; }
    .ac__action {
      border: 1px solid var(--border); border-radius: var(--radius-md, 10px);
      padding: 6px 12px; background: var(--surface); color: var(--text);
      font-size: var(--text-xs, 0.78rem); font-weight: 600; cursor: pointer;
      transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
    }
    .ac__action:hover { background: var(--surface-2); border-color: var(--border-strong, var(--primary)); }
    .ac__action:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }
    .ac__action--primary { background: var(--primary); border-color: var(--primary); color: var(--primary-contrast, #fff); }
    .ac__action--primary:hover { filter: brightness(1.05); background: var(--primary); color: var(--primary-contrast, #fff); }
    .ac__action--danger { color: var(--color-danger-text); }
    .ac__action--danger:hover { border-color: var(--color-danger-soft); background: var(--color-danger-weak); }
  `
})
export class AccountCardComponent {
  readonly account = input.required<AccountResponse>();
  readonly activity = input<AccountActivity | null>(null);
  readonly isPrimary = input<boolean>(false);
  readonly canManage = input<boolean>(false);
  readonly canTransfer = input<boolean>(false);
  readonly canSetPrimary = input<boolean>(false);

  readonly viewStatement = output<AccountResponse>();
  readonly edit = output<AccountResponse>();
  readonly remove = output<AccountResponse>();
  readonly transfer = output<AccountResponse>();
  readonly setPrimary = output<AccountResponse>();

  readonly typeLabel = computed(() => accountTypeLabel(this.account().type));
  readonly isNegative = computed(() => Number(this.account().currentBalance) < 0);
  readonly balanceAria = computed(() => `Saldo atual da conta ${this.account().name}`);

  readonly lastMovementLabel = computed(() => {
    const last = this.activity()?.lastMovementAt;
    if (!last) return 'Sem movimento';
    return formatLocaleDateFromIso(last);
  });
}
