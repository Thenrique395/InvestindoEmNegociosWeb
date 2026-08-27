import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { AppCurrencyPipe } from '../../shared/app-currency.pipe';
import {
  CalendarEvent,
  CalendarEventGroup,
  DaySummary,
  isSameDay,
  summarizeDay
} from './calendar-agenda.model';

interface CalendarCell {
  date: Date;
  inMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  groups: CalendarEventGroup[];
  summary: DaySummary;
}

const WEEKDAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
const GROUP_ORDER: CalendarEventGroup[] = ['income', 'expense', 'card', 'loan', 'goal'];

/**
 * Grid mensal enriquecido: cada dia mostra os tipos presentes (pontos por cor),
 * a quantidade de compromissos, o saldo previsto e um destaque para atrasos.
 */
@Component({
  selector: 'app-financial-calendar',
  standalone: true,
  imports: [AppCurrencyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="cal">
      <div class="cal__weekdays" aria-hidden="true">
        @for (day of weekdays; track day) {
          <span>{{ day }}</span>
        }
      </div>
      <div class="cal__grid" role="grid">
        @for (cell of cells(); track cell.date.getTime()) {
          <button
            type="button"
            role="gridcell"
            class="cal__cell"
            [class.cal__cell--outside]="!cell.inMonth"
            [class.cal__cell--today]="cell.isToday"
            [class.cal__cell--selected]="cell.isSelected"
            [class.cal__cell--overdue]="cell.summary.hasOverdue"
            [attr.aria-pressed]="cell.isSelected"
            [attr.aria-label]="ariaLabel(cell)"
            (click)="daySelected.emit(cell.date)">
            <span class="cal__num">
              {{ cell.date.getDate() }}
              @if (cell.summary.count) {
                <span class="cal__count" aria-hidden="true">{{ cell.summary.count }}</span>
              }
            </span>

            @if (cell.groups.length) {
              <span class="cal__dots" aria-hidden="true">
                @for (group of cell.groups; track group) {
                  <i class="cal__dot" [attr.data-group]="group"></i>
                }
              </span>
            }

            @if (cell.summary.net !== 0) {
              <span class="cal__net" [class.cal__net--pos]="cell.summary.net > 0" aria-hidden="true">
                {{ cell.summary.net > 0 ? '+' : '' }}{{ cell.summary.net | appCurrency }}
              </span>
            }
          </button>
        }
      </div>
    </div>
  `,
  styles: `
    :host { display: block; }
    .cal { display: grid; gap: 0.5rem; }
    .cal__weekdays {
      display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px;
      font-size: var(--fs-caption, 0.7rem); font-weight: 600; text-transform: uppercase;
      letter-spacing: 0.06em; color: var(--text-tertiary); text-align: center;
    }
    .cal__grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; }
    .cal__cell {
      position: relative;
      display: grid;
      align-content: start;
      gap: 6px;
      min-height: 82px;
      padding: 8px;
      border: 1px solid var(--border);
      border-radius: var(--radius-inner, 14px);
      background: var(--surface);
      text-align: left;
      cursor: pointer;
      transition: border-color 0.15s ease, background 0.15s ease, box-shadow 0.15s ease;
    }
    .cal__cell:hover { border-color: var(--border-strong, var(--primary)); background: var(--surface-sunken); }
    .cal__cell--outside { opacity: 0.45; }
    .cal__cell--today { border-color: var(--primary); }
    .cal__cell--selected { box-shadow: 0 0 0 2px var(--primary); border-color: var(--primary); }
    .cal__cell--overdue::after {
      content: ''; position: absolute; top: 8px; right: 8px;
      width: 6px; height: 6px; border-radius: 50%; background: var(--expense);
    }
    .cal__cell:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }

    .cal__num {
      display: inline-flex; align-items: center; gap: 6px;
      font-size: var(--fs-meta, 0.85rem); font-weight: 600; color: var(--text);
    }
    .cal__count {
      display: inline-grid; place-items: center; min-width: 16px; height: 16px; padding: 0 4px;
      border-radius: 8px; background: var(--surface-inset); color: var(--text-tertiary);
      font-size: 0.62rem; font-weight: 700;
    }
    .cal__dots { display: inline-flex; flex-wrap: wrap; gap: 4px; }
    .cal__dot { width: 6px; height: 6px; border-radius: 50%; background: var(--primary); }
    .cal__dot[data-group='income'] { background: var(--income); }
    .cal__dot[data-group='expense'] { background: var(--expense); }
    .cal__dot[data-group='card'] { background: var(--primary); }
    .cal__dot[data-group='loan'] { background: var(--warning); }
    .cal__dot[data-group='goal'] { background: var(--brand-navy-soft); }
    .cal__net {
      font-size: 0.65rem; font-weight: 600; color: var(--expense-text, var(--expense));
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .cal__net--pos { color: var(--income-text, var(--income)); }

    @media (max-width: 640px) {
      .cal__cell { min-height: 62px; padding: 6px; }
      .cal__net { display: none; }
    }
  `
})
export class FinancialCalendarComponent {
  readonly events = input.required<CalendarEvent[]>();
  readonly monthRef = input.required<Date>();
  readonly selectedDate = input.required<Date>();
  readonly today = input.required<Date>();
  readonly daySelected = output<Date>();

  readonly weekdays = WEEKDAYS;

  readonly cells = computed<CalendarCell[]>(() => {
    const monthRef = this.monthRef();
    const year = monthRef.getFullYear();
    const month = monthRef.getMonth();
    const startWeekday = (new Date(year, month, 1).getDay() + 6) % 7; // semana começa na segunda
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const totalSlots = Math.ceil((startWeekday + daysInMonth) / 7) * 7;
    const start = new Date(year, month, 1 - startWeekday);

    const events = this.events();
    const selected = this.selectedDate();
    const today = this.today();
    const cells: CalendarCell[] = [];

    for (let i = 0; i < totalSlots; i += 1) {
      const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      const dayEvents = events.filter((event) => isSameDay(event.date, date));
      const groups = GROUP_ORDER.filter((group) => dayEvents.some((event) => event.group === group && event.status !== 'canceled'));
      cells.push({
        date,
        inMonth: date.getMonth() === month,
        isToday: isSameDay(date, today),
        isSelected: isSameDay(date, selected),
        groups,
        summary: summarizeDay(dayEvents)
      });
    }
    return cells;
  });

  ariaLabel(cell: CalendarCell): string {
    const base = cell.date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' });
    if (!cell.summary.count) return `${base}, sem compromissos`;
    return `${base}, ${cell.summary.count} compromisso(s)`;
  }
}
