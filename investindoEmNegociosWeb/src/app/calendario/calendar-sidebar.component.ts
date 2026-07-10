import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { AppCurrencyPipe } from '../shared/app-currency.pipe';
import { CalendarEvent, categoryFor, TodayDigest } from './calendar-agenda.model';
import { formatLocaleDate } from '../utils/locale-utils';

interface DigestRow {
  label: string;
  value: number;
  group: string;
}

/**
 * Painel lateral de resumo rápido: o que acontece Hoje, os Próximos 7 dias e
 * as Pendências (compromissos atrasados). Todos os números vêm de eventos reais.
 */
@Component({
  selector: 'app-calendar-sidebar',
  standalone: true,
  imports: [AppCurrencyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="side">
      <section class="side__block">
        <header class="side__head">
          <h3 class="side__title">Hoje</h3>
          <span class="side__badge">{{ digest().total }}</span>
        </header>
        @if (digest().total) {
          <ul class="side__digest">
            @for (row of digestRows(); track row.group) {
              @if (row.value) {
                <li class="side__digest-row">
                  <i class="side__dot" [attr.data-group]="row.group"></i>
                  <span class="side__digest-label">{{ row.label }}</span>
                  <span class="side__digest-value">{{ row.value }}</span>
                </li>
              }
            }
          </ul>
        } @else {
          <p class="side__empty">Nenhum compromisso para hoje.</p>
        }
      </section>

      <section class="side__block">
        <header class="side__head">
          <h3 class="side__title">Próximos 7 dias</h3>
          <span class="side__badge">{{ upcoming().length }}</span>
        </header>
        @if (upcoming().length) {
          <ul class="side__list">
            @for (event of upcoming(); track event.id) {
              <li>
                <button type="button" class="side__row" (click)="eventSelected.emit(event)">
                  <i class="side__dot" [attr.data-group]="event.group"></i>
                  <span class="side__row-main">
                    <span class="side__row-title">{{ event.title }}</span>
                    <span class="side__row-meta">{{ dateLabel(event) }}</span>
                  </span>
                  @if (event.amount != null) {
                    <span class="side__row-amount">{{ event.amount | appCurrency }}</span>
                  }
                </button>
              </li>
            }
          </ul>
        } @else {
          <p class="side__empty">Sem compromissos na próxima semana.</p>
        }
      </section>

      <section class="side__block" [class.side__block--alert]="pending().length">
        <header class="side__head">
          <h3 class="side__title">Pendências</h3>
          <span class="side__badge" [class.side__badge--danger]="pending().length">{{ pending().length }}</span>
        </header>
        @if (pending().length) {
          <ul class="side__list">
            @for (event of pending(); track event.id) {
              <li>
                <button type="button" class="side__row side__row--danger" (click)="eventSelected.emit(event)">
                  <i class="side__dot" data-group="overdue"></i>
                  <span class="side__row-main">
                    <span class="side__row-title">{{ event.title }}</span>
                    <span class="side__row-meta">Venceu em {{ dateLabel(event) }} · {{ label(event) }}</span>
                  </span>
                  @if (event.amount != null) {
                    <span class="side__row-amount side__row-amount--danger">{{ event.amount | appCurrency }}</span>
                  }
                </button>
              </li>
            }
          </ul>
        } @else {
          <p class="side__empty">Nada atrasado. Tudo em dia! 🎉</p>
        }
      </section>
    </div>
  `,
  styles: `
    :host { display: block; }
    .side { display: grid; gap: 1rem; }
    .side__block {
      display: grid; gap: 0.7rem;
      padding: 1.05rem 1.1rem;
      border: 1px solid var(--border); border-radius: var(--radius-xl);
      background: var(--surface); box-shadow: var(--shadow-elevation-sm);
    }
    .side__block--alert { border-color: var(--color-danger-soft); }
    .side__head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
    .side__title { margin: 0; font-size: var(--text-sm, 0.9rem); font-weight: 700; color: var(--text); }
    .side__badge {
      display: inline-grid; place-items: center; min-width: 22px; height: 22px; padding: 0 7px;
      border-radius: 11px; background: var(--surface-3); color: var(--text-muted);
      font-size: 0.72rem; font-weight: 700;
    }
    .side__badge--danger { background: var(--color-danger-weak); color: var(--color-danger-text); }

    .side__digest { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
    .side__digest-row { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: 8px; }
    .side__digest-label { font-size: var(--text-sm, 0.82rem); color: var(--text); }
    .side__digest-value { font-size: var(--text-sm, 0.82rem); font-weight: 700; color: var(--text); }

    .side__list { list-style: none; margin: 0; padding: 0; display: grid; gap: 4px; }
    .side__row {
      width: 100%; display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: 8px;
      border: 0; border-radius: var(--radius-md, 10px); padding: 8px; background: transparent;
      text-align: left; cursor: pointer; transition: background 0.15s ease;
    }
    .side__row:hover { background: var(--surface-2); }
    .side__row:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }
    .side__row-main { min-width: 0; display: grid; gap: 2px; }
    .side__row-title { font-size: var(--text-sm, 0.82rem); color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .side__row-meta { font-size: var(--text-xs, 0.7rem); color: var(--text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .side__row-amount { font-size: var(--text-xs, 0.75rem); font-weight: 600; color: var(--text); white-space: nowrap; }
    .side__row-amount--danger { color: var(--color-danger-text); }

    .side__dot { width: 8px; height: 8px; border-radius: 50%; background: var(--info); }
    .side__dot[data-group='income'] { background: var(--success); }
    .side__dot[data-group='expense'] { background: var(--danger); }
    .side__dot[data-group='card'] { background: var(--warning); }
    .side__dot[data-group='loan'] { background: var(--warning); }
    .side__dot[data-group='goal'] { background: var(--info); }
    .side__dot[data-group='overdue'] { background: var(--danger); }

    .side__empty { margin: 0; font-size: var(--text-sm, 0.8rem); color: var(--text-muted); }
  `
})
export class CalendarSidebarComponent {
  readonly digest = input.required<TodayDigest>();
  readonly upcoming = input.required<CalendarEvent[]>();
  readonly pending = input.required<CalendarEvent[]>();
  readonly eventSelected = output<CalendarEvent>();

  digestRows(): DigestRow[] {
    const d = this.digest();
    return [
      { label: 'Contas vencendo', value: d.expenses, group: 'expense' },
      { label: 'Receitas previstas', value: d.incomes, group: 'income' },
      { label: 'Cartões', value: d.cards, group: 'card' },
      { label: 'Parcelas', value: d.loans, group: 'loan' },
      { label: 'Metas', value: d.goals, group: 'goal' }
    ];
  }

  dateLabel(event: CalendarEvent): string {
    return formatLocaleDate(event.date);
  }

  label(event: CalendarEvent): string {
    return categoryFor(event.kind).label;
  }
}
