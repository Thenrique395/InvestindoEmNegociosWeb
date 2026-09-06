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
      <div class="mv__scroll">
        <div class="mv__grid">
          <div class="mv__head">
            <span>Data</span><span>Descrição</span><span>Tipo</span><span class="mv__num">Valor</span>
          </div>

          @for (tx of transactions(); track tx.id) {
            <div class="mv__row">
              <span class="mv__date">{{ tx.occurredAt | date:'dd/MM' }}</span>
              <div class="mv__main">
                <span class="mv__desc">{{ tx.description }}</span>
                <span class="mv__sub">{{ sourceLabel(tx) }}</span>
              </div>
              <span><app-status-badge [tone]="typeTone(tx.type)" size="sm" [label]="typeLabel(tx.type)" /></span>
              <span class="mv__num" [class.mv__pos]="tx.kind === 'Credit'">
                {{ tx.kind === 'Credit' ? '' : '− ' }}{{ tx.amount | appCurrency:currency() }}
              </span>
            </div>
          }
        </div>
      </div>

      <ul class="mv__cards">
        @for (tx of transactions(); track tx.id) {
          <li class="mv__card">
            <div class="mv__card-row">
              <strong class="mv__desc">{{ tx.description }}</strong>
              <strong [class.mv__pos]="tx.kind === 'Credit'">
                {{ tx.kind === 'Credit' ? '' : '− ' }}{{ tx.amount | appCurrency:currency() }}
              </strong>
            </div>
            <div class="mv__card-meta">
              <app-status-badge [tone]="typeTone(tx.type)" size="sm" [label]="typeLabel(tx.type)" />
              <span>{{ tx.occurredAt | date:'dd/MM/yyyy' }}</span>
              <span class="mv__sub">· {{ sourceLabel(tx) }}</span>
            </div>
          </li>
        }
      </ul>
    </div>
  `,
  styles: `
    :host { display: block; }

    /* As quatro colunas do handoff. Abaixo de 720px a grade some e entram os
       cards — o scroll lateral fica só para a faixa entre 600 e 720px. */
    .mv__scroll { overflow-x: auto; }
    .mv__grid { min-inline-size: 600px; }

    .mv__head, .mv__row {
      display: grid;
      grid-template-columns: 88px minmax(200px, 2.2fr) minmax(124px, 1fr) 122px;
      gap: 0.875rem;
      align-items: center;
    }

    .mv__head {
      padding: 0.625rem 0;
      background: var(--surface-sunken);
      border-bottom: 1px solid var(--border-inner);
      font-size: var(--fs-micro);
      font-weight: var(--fw-bold);
      letter-spacing: var(--ls-column);
      text-transform: uppercase;
      color: var(--text-tertiary);
    }

    .mv__row { padding: 0.75rem 0; border-bottom: 1px solid var(--border-row); }

    .mv__date { font-size: var(--fs-meta); color: var(--text-secondary); }

    .mv__main { min-width: 0; }
    .mv__desc {
      display: block; font-size: var(--fs-body); font-weight: var(--fw-semibold); color: var(--text);
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .mv__sub { display: block; font-size: var(--fs-caption); color: var(--text-muted); }

    /* Crédito em verde, débito no escuro do texto: só a entrada é destaque —
       saída já é a maioria das linhas, e pintar todas de vermelho vira ruído. */
    .mv__num {
      text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums;
      font-size: var(--fs-body); font-weight: var(--fw-semibold); color: var(--text);
    }
    .mv__pos { color: var(--income-text); }

    .mv__cards { display: none; list-style: none; margin: 0; padding: 0; }
    .mv__card {
      display: grid; gap: 6px; padding: 0.75rem; border: 1px solid var(--border);
      border-radius: var(--radius-item); background: var(--surface-sunken); margin-bottom: 8px;
    }
    .mv__card-row { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
    .mv__card-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; font-size: var(--fs-caption); color: var(--text-tertiary); }

    @media (max-width: 720px) {
      .mv__scroll { display: none; }
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
