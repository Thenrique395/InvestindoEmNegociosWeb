import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { AppCurrencyPipe } from '../../../../shared/app-currency.pipe';
import { AccountResponse } from '../../../../core/account.models';
import { AccountActivity, accountTypeLabel } from '../../../../core/accounts-overview.model';
import { AccountType } from '../../../../core/account.models';

/** Um traço por tipo de conta, como no handoff — o ícone diz o tipo antes do texto. */
const TYPE_ICONS: Record<AccountType | 'Other', string> = {
  Checking: 'M3 9l9-6 9 6v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z',
  Savings: 'M4 8h16a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1zM7 8V6a3 3 0 0 1 3-3h4a3 3 0 0 1 3 3v2',
  DigitalWallet: 'M3 7h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2zM16 13h.01',
  Cash: 'M3 7h18a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1zM12 10a2 2 0 1 1 0 4 2 2 0 0 1 0-4z',
  Other: 'M4 6h16M4 12h16M4 18h16'
};

/**
 * Cartão de uma conta financeira. Consolida saldo, status, conta principal e
 * atividade do período (entradas/saídas/movimentações), com ações rápidas.
 * Reutilizável na lista de contas e, futuramente, em resumos do dashboard.
 */
@Component({
  selector: 'app-account-card',
  standalone: true,
  imports: [AppCurrencyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="ac" [class.ac--negative]="isNegative()" [class.ac--inactive]="!account().isActive">
      <header class="ac__head">
        <div class="ac__identity">
          <span class="ac__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" role="presentation" focusable="false">
              <path [attr.d]="typeIcon()" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </span>
          <div class="ac__title">
            <h3 class="ac__name">{{ account().name }}</h3>
            <p class="ac__type">{{ typeLabel() }}</p>
          </div>
        </div>

        <div class="ac__head-actions">
          @if (isPrimary()) {
            <span class="ac__primary-tag">Principal</span>
          }
          @if (account().currency !== 'BRL') {
            <span class="ac__currency-tag">{{ account().currency }}</span>
          }
          @if (canManage()) {
            <button type="button" class="ac__icon-action" (click)="edit.emit(account())" [attr.aria-label]="'Editar conta ' + account().name" title="Editar conta">
              <svg viewBox="0 0 24 24" role="presentation" focusable="false">
                <path d="M4 20h4l10-10-4-4L4 16v4Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" />
                <path d="m12 6 4 4" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </button>
            <button type="button" class="ac__icon-action ac__icon-action--danger" (click)="remove.emit(account())" [attr.aria-label]="'Remover conta ' + account().name" title="Remover conta">
              <svg viewBox="0 0 24 24" role="presentation" focusable="false">
                <path d="M5 7h14M10 11v6M14 11v6M8 7l1-2h6l1 2M8 7v11a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V7" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </button>
          }
        </div>
      </header>

      <div class="ac__balance">
        <span class="ac__balance-label">Saldo atual</span>
        <strong class="ac__balance-value" [attr.aria-label]="balanceAria()">{{ account().currentBalance | appCurrency:account().currency }}</strong>
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
        </dl>
      }

      <footer class="ac__actions">
        <button type="button" class="ac__action" (click)="viewStatement.emit(account())">Ver extrato</button>
        @if (canManage() && canTransfer()) {
          <button type="button" class="ac__action" (click)="transfer.emit(account())">Transferir</button>
        }
        @if (canManage() && canSetPrimary() && !isPrimary() && account().isActive) {
          <button type="button" class="ac__action ac__action--star" (click)="setPrimary.emit(account())" [attr.aria-label]="'Definir ' + account().name + ' como conta principal'" title="Definir como conta principal">
            <svg viewBox="0 0 24 24" role="presentation" focusable="false">
              <path d="m12 4 2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4-3.9-3.8 5.4-.8z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" />
            </svg>
          </button>
        }
      </footer>
    </article>
  `,
  styles: `
    :host { display: block; height: 100%; }

    /* README §3: card em repouso tem só a borda. A sombra permanente daqui
       vinha de --shadow-card-hover aplicada em repouso. */
    .ac {
      display: flex;
      flex-direction: column;
      gap: 0.875rem;
      height: 100%;
      padding: 1.125rem 1.25rem;
      border: 1px solid var(--border);
      border-radius: var(--radius-card);
      background: var(--surface);
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
    }
    .ac:hover { border-color: var(--border-strong); box-shadow: var(--shadow-card-hover); }

    /* Saldo negativo é o único estado que tinge a borda: o vermelho aqui é
       alerta, não decoração de tipo de conta. */
    .ac--negative { border-color: color-mix(in srgb, var(--expense) 30%, transparent); }
    .ac--inactive { opacity: 0.82; }

    .ac__head { display: flex; align-items: flex-start; justify-content: space-between; gap: 0.75rem; }
    .ac__identity { display: flex; align-items: center; gap: 0.6875rem; min-width: 0; }

    .ac__icon {
      display: grid; place-items: center; inline-size: 36px; block-size: 36px; flex: none;
      border-radius: var(--radius-item); background: var(--primary-tint); color: var(--primary-text);
    }
    .ac__icon svg { inline-size: 18px; block-size: 18px; }
    .ac--negative .ac__icon { background: var(--expense-tint); color: var(--expense-text); }
    .ac--inactive .ac__icon { background: var(--surface-sunken); color: var(--text-muted); }

    .ac__title { min-width: 0; }
    .ac__name {
      margin: 0; font-size: var(--fs-card-title); font-weight: var(--fw-semibold); color: var(--text);
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .ac__type {
      margin: 3px 0 0; font-size: var(--fs-caption); color: var(--text-muted);
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }

    .ac__head-actions { display: flex; align-items: center; gap: 3px; flex: none; }

    .ac__primary-tag, .ac__currency-tag {
      margin-right: 4px; padding: 2px 8px; border-radius: var(--radius-pill);
      font-size: var(--fs-micro); font-weight: var(--fw-bold); white-space: nowrap;
    }
    .ac__primary-tag { background: var(--primary-tint); color: var(--primary-text); }
    .ac__currency-tag { background: var(--surface-sunken); color: var(--text-tertiary); }

    .ac__icon-action {
      display: grid; place-items: center; inline-size: var(--h-icon-button); block-size: var(--h-icon-button);
      border: none; border-radius: var(--radius-xs); background: transparent; color: var(--text-muted);
      cursor: pointer; transition: var(--control-transition);
    }
    .ac__icon-action svg { inline-size: 15px; block-size: 15px; }
    .ac__icon-action:hover, .ac__icon-action:focus-visible { background: var(--surface-sunken); color: var(--primary-text); }
    .ac__icon-action--danger { color: color-mix(in srgb, var(--expense-text) 45%, var(--text-muted)); }
    .ac__icon-action--danger:hover, .ac__icon-action--danger:focus-visible {
      background: color-mix(in srgb, var(--expense) 8%, transparent); color: var(--expense-text);
    }

    .ac__balance-label { display: block; font-size: var(--fs-caption); color: var(--text-tertiary); }
    .ac__balance-value {
      display: block; margin-top: 3px; font-family: var(--font-display); font-size: 24px;
      font-weight: var(--fw-semibold); letter-spacing: var(--ls-tighter); color: var(--text);
    }
    .ac--negative .ac__balance-value { color: var(--expense-text); }

    .ac__activity {
      display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin: 0;
      padding-top: 0.75rem; border-top: 1px solid var(--border-row);
    }
    .ac__activity-item { min-width: 0; }
    .ac__activity dt { font-size: var(--fs-caption); color: var(--text-tertiary); }
    /* Sem cor no seletor genérico: .ac__activity dd (0-1-1) vencia .ac__in
       (0-1-0) e os valores ficavam pretos. A cor vem só dos modificadores. */
    .ac__activity dd {
      margin: 3px 0 0; font-size: var(--fs-body); font-weight: var(--fw-semibold);
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .ac__activity .ac__in { color: var(--income-text); }
    .ac__activity .ac__out { color: var(--expense-text); }

    /* margin-top:auto prende o rodapé embaixo: os cards da grade têm alturas
       de conteúdo diferentes e os botões precisam alinhar entre eles. */
    .ac__actions {
      display: flex; gap: 0.5rem; margin-top: auto;
      padding-top: 0.75rem; border-top: 1px solid var(--border-row);
    }
    .ac__action {
      flex: 1; block-size: 34px; border: 1px solid var(--border-strong); border-radius: var(--radius-sm);
      background: var(--surface); color: var(--text); font-size: var(--fs-meta); font-weight: var(--fw-semibold);
      cursor: pointer; transition: var(--control-transition);
    }
    .ac__action:hover { background: var(--surface-sunken); }
    .ac__action:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }

    .ac__action--star { flex: none; display: grid; place-items: center; inline-size: 34px; color: var(--text-muted); }
    .ac__action--star svg { inline-size: 15px; block-size: 15px; }
    .ac__action--star:hover { color: var(--warning-text); }
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

  /** Conta inativa não ganha badge própria: o estado entra no subtítulo. */
  readonly typeLabel = computed(() => {
    const base = accountTypeLabel(this.account().type);
    return this.account().isActive ? base : `${base} · inativa`;
  });

  readonly typeIcon = computed(() => TYPE_ICONS[this.account().type] ?? TYPE_ICONS.Other);
  readonly isNegative = computed(() => Number(this.account().currentBalance) < 0);
  readonly balanceAria = computed(() => `Saldo atual da conta ${this.account().name}`);
}
