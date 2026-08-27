import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { AppCurrencyPipe } from '../../../../shared/app-currency.pipe';
import { StatusBadgeComponent, StatusBadgeTone } from '../../../../shared/status-badge/status-badge.component';
import { AccountTransactionResponse, AccountTransactionType } from '../../../../core/account.models';

/**
 * Lista responsiva de movimentações de conta (tabela no desktop, cards no
 * mobile). Diferencia receita, despesa e transferência — transferência é
 * apresentada de forma neutra, sem ser tratada como receita/despesa real.
 */
@Component({
  selector: 'app-account-movements-list',
  standalone: true,
  imports: [DatePipe, AppCurrencyPipe, StatusBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mv">
      <table class="mv__table">
        <thead>
          <tr>
            <th scope="col">Data</th>
            <th scope="col">Tipo</th>
            <th scope="col">Descrição</th>
            <th scope="col">Origem</th>
            <th scope="col" class="mv__num">Valor</th>
          </tr>
        </thead>
        <tbody>
          @for (tx of transactions(); track tx.id) {
            <tr>
              <td>{{ tx.occurredAt | date:'dd/MM/yyyy HH:mm' }}</td>
              <td><app-status-badge [tone]="typeTone(tx.type)" size="sm" [label]="typeLabel(tx.type)" /></td>
              <td class="mv__desc">{{ tx.description }}</td>
              <td class="mv__muted">{{ sourceLabel(tx) }}</td>
              <td class="mv__num" [class.mv__pos]="tx.kind === 'Credit'" [class.mv__neg]="tx.kind === 'Debit'">
                {{ tx.kind === 'Credit' ? '+' : '-' }}{{ tx.amount | appCurrency:currency() }}
              </td>
            </tr>
          }
        </tbody>
      </table>

      <ul class="mv__cards">
        @for (tx of transactions(); track tx.id) {
          <li class="mv__card">
            <div class="mv__card-row">
              <strong class="mv__desc">{{ tx.description }}</strong>
              <strong [class.mv__pos]="tx.kind === 'Credit'" [class.mv__neg]="tx.kind === 'Debit'">
                {{ tx.kind === 'Credit' ? '+' : '-' }}{{ tx.amount | appCurrency:currency() }}
              </strong>
            </div>
            <div class="mv__card-meta">
              <app-status-badge [tone]="typeTone(tx.type)" size="sm" [label]="typeLabel(tx.type)" />
              <span>{{ tx.occurredAt | date:'dd/MM/yyyy HH:mm' }}</span>
              <span class="mv__muted">· {{ sourceLabel(tx) }}</span>
            </div>
          </li>
        }
      </ul>
    </div>
  `,
  styles: `
    :host { display: block; }
    .mv__table { width: 100%; border-collapse: collapse; font-size: var(--fs-meta, 0.85rem); }
    .mv__table thead th {
      text-align: left; padding: 0.5rem 0.75rem 0.5rem 0;
      font-size: var(--fs-caption, 0.7rem); text-transform: uppercase; letter-spacing: 0.05em;
      color: var(--text-tertiary); border-bottom: 1px solid var(--border);
    }
    .mv__table tbody td { padding: 0.6rem 0.75rem 0.6rem 0; border-bottom: 1px solid var(--border); color: var(--text); vertical-align: middle; }
    .mv__num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
    .mv__desc { overflow: hidden; text-overflow: ellipsis; }
    .mv__muted { color: var(--text-tertiary); }
    .mv__pos { color: var(--income-text, var(--income)); }
    .mv__neg { color: var(--expense-text, var(--expense)); }

    .mv__cards { display: none; list-style: none; margin: 0; padding: 0; }
    .mv__card {
      display: grid; gap: 6px; padding: 0.75rem; border: 1px solid var(--border);
      border-radius: var(--radius-inner, 12px); background: var(--surface-sunken); margin-bottom: 8px;
    }
    .mv__card-row { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
    .mv__card-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; font-size: var(--fs-caption, 0.72rem); color: var(--text-tertiary); }

    @media (max-width: 720px) {
      .mv__table { display: none; }
      .mv__cards { display: block; }
    }
  `
})
export class AccountMovementsListComponent {
  readonly transactions = input.required<AccountTransactionResponse[]>();
  readonly currency = input<string>('BRL');

  typeLabel(type: AccountTransactionType): string {
    switch (type) {
      case 'Income': return 'Receita';
      case 'Expense': return 'Despesa';
      case 'Transfer': return 'Transferência';
      default: return 'Movimentação';
    }
  }

  typeTone(type: AccountTransactionType): StatusBadgeTone {
    switch (type) {
      case 'Income': return 'success';
      case 'Expense': return 'danger';
      case 'Transfer': return 'info';
      default: return 'muted';
    }
  }

  sourceLabel(tx: AccountTransactionResponse): string {
    return tx.sourceLabel?.trim() || tx.sourceType?.trim() || '—';
  }
}
