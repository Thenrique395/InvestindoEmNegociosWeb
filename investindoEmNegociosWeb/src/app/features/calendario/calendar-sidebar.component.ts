import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { AppCurrencyPipe } from '../../shared/app-currency.pipe';
import { CalendarEvent, categoryFor, daysBetween, TodayDigest } from './calendar-agenda.model';
import { formatDayMonth, formatDayMonthParts, formatFullLocaleDate } from '../../core/utils/locale-utils';

interface DigestRow {
  label: string;
  value: number;
  group: string;
}

/**
 * Painel lateral de resumo rápido: o que acontece Hoje, os Próximos 7 dias e
 * as Pendências (compromissos atrasados). Todos os números vêm de eventos reais.
 *
 * O desenho segue o protótipo `Calendario.dc.html`: cada bloco é um card branco
 * independente; o resumo do dia vira uma pilha de pílulas, a lista da semana
 * ganha a coluna de data (dia grande + mês em caixa alta) e as pendências saem
 * do cinza para o vermelho tingido, com o valor e o atraso à vista.
 */
@Component({
  selector: 'app-calendar-sidebar',
  standalone: true,
  imports: [AppCurrencyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="side">
      <section class="side__block">
        <h3 class="side__title">Resumo de hoje</h3>
        <p class="side__subtitle">{{ todayLabel() }}</p>
        @if (digest().total) {
          <ul class="side__digest">
            @for (row of digestRows(); track row.group) {
              <li class="side__pill">
                <i class="side__dot" [attr.data-group]="row.group"></i>
                <span class="side__pill-label">{{ row.label }}</span>
                <span class="side__pill-value ffx">{{ row.value }}</span>
              </li>
            }
          </ul>
        } @else {
          <p class="side__empty">Nenhum compromisso para hoje.</p>
        }
      </section>

      <section class="side__block">
        <header class="side__head">
          <h3 class="side__title">Próximos 7 dias</h3>
          @if (upcoming().length) {
            <button type="button" class="side__link" (click)="viewAll.emit()">Ver todos</button>
          }
        </header>
        @if (upcoming().length) {
          <ul class="side__list">
            @for (event of upcoming(); track event.id) {
              <li>
                <button type="button" class="side__row" (click)="eventSelected.emit(event)">
                  <span class="side__date">
                    <span class="side__date-day ffx">{{ dayPart(event) }}</span>
                    <span class="side__date-month">{{ monthPart(event) }}</span>
                  </span>
                  <span class="side__row-main">
                    <span class="side__row-title">{{ event.title }}</span>
                    <span class="side__row-meta">{{ subtitle(event) }}</span>
                  </span>
                  <span class="side__row-amount ffx" [attr.data-tone]="amountTone(event)">
                    @if (event.amount != null) {
                      {{ amountSign(event) }}{{ event.amount | appCurrency }}
                    } @else {
                      —
                    }
                  </span>
                </button>
              </li>
            }
          </ul>
        } @else {
          <p class="side__empty">Sem compromissos na próxima semana.</p>
        }
      </section>

      <section class="side__block" [class.side__block--alert]="pending().length">
        <header class="side__head side__head--tight">
          @if (pending().length) {
            <svg class="side__warn" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"
              stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M12 8v5m0 3h.01M10.2 4.8 3.7 16a2 2 0 0 0 1.73 3h13.14A2 2 0 0 0 20.3 16L13.8 4.8a2 2 0 0 0-3.46 0Z" />
            </svg>
          }
          <h3 class="side__title">Pendências</h3>
        </header>
        @if (pending().length) {
          <p class="side__subtitle">Compromissos atrasados a regularizar.</p>
          <ul class="side__alerts">
            @for (event of pending(); track event.id) {
              <li>
                <button type="button" class="side__alert" (click)="eventSelected.emit(event)">
                  <span class="side__alert-head">
                    <span class="side__alert-title">{{ event.title }}</span>
                    @if (event.amount != null) {
                      <span class="side__alert-amount ffx">{{ amountSign(event) }}{{ event.amount | appCurrency }}</span>
                    }
                  </span>
                  <span class="side__alert-meta ffx">{{ overdueLabel(event) }}</span>
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
    .side { display: grid; gap: var(--space-8); }

    .side__block {
      padding: var(--space-8) var(--space-9);
      border: 1px solid var(--border);
      border-radius: var(--radius-card);
      background: var(--surface);
    }
    .side__block--alert { border-color: var(--expense-border); }

    .side__head { display: flex; align-items: center; justify-content: space-between; gap: var(--space-4); margin-bottom: var(--space-5); }
    .side__head--tight { justify-content: flex-start; gap: var(--space-3); margin-bottom: var(--space-1); }
    .side__title { margin: 0; font-size: var(--fs-subhead); font-weight: var(--fw-semibold); color: var(--text); }
    .side__subtitle { margin: var(--space-1) 0 var(--space-6); font-size: var(--fs-meta); color: var(--text-tertiary); }
    .side__warn { width: 15px; height: 15px; flex: none; color: var(--expense-text); }

    .side__link {
      border: 0; background: none; padding: 0; cursor: pointer;
      font: inherit; font-size: var(--fs-meta); font-weight: var(--fw-semibold); color: var(--primary-text);
    }
    .side__link:hover { text-decoration: underline; }
    .side__link:focus-visible { outline: 2px solid var(--primary); outline-offset: 3px; border-radius: var(--radius-xs); }

    /* ---- Resumo de hoje ---- */
    .side__digest { list-style: none; margin: 0; padding: 0; display: grid; gap: var(--space-3); }
    .side__pill {
      display: flex; align-items: center; gap: var(--space-4);
      padding: var(--space-3) var(--space-5);
      border: 1px solid var(--border-inner); border-radius: var(--radius-control);
      background: var(--surface-subtle);
    }
    .side__pill-label { flex: 1; font-size: var(--fs-meta); color: var(--text); }
    .side__pill-value { font-size: var(--fs-body); font-weight: var(--fw-semibold); color: var(--text); }

    /* ---- Próximos 7 dias ---- */
    .side__list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
    .side__list > li:not(:last-child) .side__row { border-bottom: 1px solid var(--border-row); }
    .side__row {
      width: 100%; display: flex; align-items: center; gap: var(--space-4);
      border: 0; border-radius: 0; padding: var(--space-4) 0; background: transparent;
      text-align: left; cursor: pointer; transition: background var(--dur-hover) var(--ease-out);
    }
    .side__row:hover { background: var(--surface-sunken); }
    .side__row:focus-visible { outline: 2px solid var(--primary); outline-offset: -2px; border-radius: var(--radius-xs); }

    .side__date { flex: none; width: var(--w-agenda-date); text-align: center; }
    .side__date-day { display: block; font-size: var(--fs-subhead); font-weight: var(--fw-bold); line-height: 1; color: var(--text); }
    .side__date-month {
      display: block; font-size: var(--fs-micro); font-weight: var(--fw-semibold);
      letter-spacing: var(--ls-column); text-transform: uppercase; color: var(--text-muted);
    }

    .side__row-main { flex: 1; min-width: 0; display: grid; }
    .side__row-title { font-size: var(--fs-meta); font-weight: var(--fw-semibold); color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .side__row-meta { font-size: var(--fs-caption); color: var(--text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .side__row-amount { flex: none; font-size: var(--fs-meta); font-weight: var(--fw-semibold); color: var(--text); white-space: nowrap; }
    .side__row-amount[data-tone='income'] { color: var(--income-text); }
    .side__row-amount[data-tone='none'] { color: var(--text-muted); }

    /* ---- Pendências ---- */
    .side__alerts { list-style: none; margin: 0; padding: 0; display: grid; gap: var(--space-3); }
    .side__alert {
      width: 100%; display: grid; gap: var(--space-1); text-align: left; cursor: pointer;
      padding: var(--space-4) var(--space-5);
      border: 1px solid var(--expense-border); border-radius: var(--radius-item);
      background: var(--expense-tint-soft);
      transition: background var(--dur-hover) var(--ease-out);
    }
    .side__alert:hover { background: var(--expense-tint); }
    .side__alert:focus-visible { outline: 2px solid var(--expense); outline-offset: 2px; }
    .side__alert-head { display: flex; align-items: baseline; justify-content: space-between; gap: var(--space-4); }
    .side__alert-title { font-size: var(--fs-meta); font-weight: var(--fw-semibold); color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .side__alert-amount { flex: none; font-size: var(--fs-meta); font-weight: var(--fw-semibold); color: var(--expense-text); white-space: nowrap; }
    .side__alert-meta { font-size: var(--fs-caption); color: var(--expense-text); }

    .side__dot { width: 8px; height: 8px; flex: none; border-radius: var(--radius-pill); background: var(--primary); }
    .side__dot[data-group='income'] { background: var(--income); }
    .side__dot[data-group='expense'] { background: var(--expense); }
    .side__dot[data-group='card'] { background: var(--primary); }
    .side__dot[data-group='loan'] { background: var(--warning); }
    .side__dot[data-group='goal'] { background: var(--brand-navy-soft); }

    .side__empty { margin: 0; font-size: var(--fs-meta); color: var(--text-tertiary); }
  `
})
export class CalendarSidebarComponent {
  readonly digest = input.required<TodayDigest>();
  readonly upcoming = input.required<CalendarEvent[]>();
  readonly pending = input.required<CalendarEvent[]>();
  readonly today = input<Date>(new Date());
  readonly eventSelected = output<CalendarEvent>();
  readonly viewAll = output<void>();

  todayLabel(): string {
    return formatFullLocaleDate(this.today());
  }

  digestRows(): DigestRow[] {
    const d = this.digest();
    return [
      { label: 'Despesas', value: d.expenses, group: 'expense' },
      { label: 'Receitas', value: d.incomes, group: 'income' },
      { label: 'Cartões', value: d.cards, group: 'card' },
      { label: 'Financiamentos', value: d.loans, group: 'loan' },
      { label: 'Metas', value: d.goals, group: 'goal' }
    ];
  }

  dayPart(event: CalendarEvent): string {
    return formatDayMonthParts(event.date).day;
  }

  monthPart(event: CalendarEvent): string {
    return formatDayMonthParts(event.date).month;
  }

  /** `Moradia · recorrente` — só o que existe de verdade no lançamento. */
  subtitle(event: CalendarEvent): string {
    const parts = [event.category, event.meta].filter((part): part is string => !!part);
    return parts.length ? parts.join(' · ') : categoryFor(event.kind).label;
  }

  /** Entrada é positiva; o resto sai com o sinal de menos, como no protótipo. */
  amountTone(event: CalendarEvent): 'income' | 'expense' | 'none' {
    if (event.amount == null) return 'none';
    return event.group === 'income' ? 'income' : 'expense';
  }

  /** Menos tipográfico (U+2212), o mesmo sinal usado no card de evolução. */
  amountSign(event: CalendarEvent): string {
    return event.group === 'income' ? '' : '\u2212 ';
  }

  overdueLabel(event: CalendarEvent): string {
    const days = daysBetween(event.date, this.today());
    const atraso = days === 1 ? '1 dia de atraso' : `${days} dias de atraso`;
    return `venceu em ${formatDayMonth(event.date)} · ${atraso}`;
  }
}
