import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { AppCurrencyPipe } from '../shared/app-currency.pipe';
import { FinancialEventCardComponent } from './financial-event-card.component';
import { CalendarEvent, DayGroup, isSameDay } from './calendar-agenda.model';

/**
 * Visão Agenda: eventos agrupados por dia, em ordem cronológica.
 * Sem horários fabricados — o sistema só possui datas.
 */
@Component({
  selector: 'app-financial-agenda',
  standalone: true,
  imports: [AppCurrencyPipe, FinancialEventCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="agenda">
      @for (group of groups(); track group.date.getTime()) {
        <section class="agenda__day">
          <header class="agenda__head">
            <div class="agenda__date">
              <span class="agenda__weekday">{{ weekday(group.date) }}</span>
              <span class="agenda__daynum" [class.agenda__daynum--today]="isToday(group.date)">{{ group.date.getDate() }}</span>
              <span class="agenda__month">{{ month(group.date) }}</span>
            </div>
            <div class="agenda__totals">
              @if (group.summary.incomeTotal) {
                <span class="agenda__in">+{{ group.summary.incomeTotal | appCurrency }}</span>
              }
              @if (group.summary.expenseTotal) {
                <span class="agenda__out">-{{ group.summary.expenseTotal | appCurrency }}</span>
              }
            </div>
          </header>
          <div class="agenda__events">
            @for (event of group.events; track event.id) {
              <app-financial-event-card
                [event]="event"
                [pending]="pendingIds().has(event.id)"
                (markDone)="markDone.emit($event)" />
            }
          </div>
        </section>
      }
    </div>
  `,
  styles: `
    :host { display: block; }
    .agenda { display: grid; gap: 1.2rem; }
    .agenda__day { display: grid; grid-template-columns: 84px minmax(0, 1fr); gap: 1rem; }
    .agenda__head {
      display: grid; gap: 8px; align-content: start;
      padding-top: 4px;
    }
    .agenda__date { display: grid; text-align: center; }
    .agenda__weekday { font-size: var(--fs-caption, 0.7rem); text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-tertiary); }
    .agenda__daynum { font-size: 1.6rem; font-weight: 700; color: var(--text); line-height: 1.1; }
    .agenda__daynum--today {
      color: var(--primary-text, var(--primary));
    }
    .agenda__month { font-size: var(--fs-caption, 0.7rem); color: var(--text-tertiary); text-transform: capitalize; }
    .agenda__totals { display: grid; gap: 2px; text-align: center; font-size: var(--fs-caption, 0.72rem); font-weight: 600; }
    .agenda__in { color: var(--income-text, var(--income)); }
    .agenda__out { color: var(--expense-text, var(--expense)); }
    .agenda__events { display: grid; gap: 8px; }

    @media (max-width: 560px) {
      .agenda__day { grid-template-columns: 1fr; gap: 0.5rem; }
      .agenda__head { grid-auto-flow: column; justify-content: space-between; align-items: center; }
      .agenda__date { grid-auto-flow: column; gap: 8px; align-items: baseline; text-align: left; }
      .agenda__daynum { font-size: 1.1rem; }
    }
  `
})
export class FinancialAgendaComponent {
  readonly groups = input.required<DayGroup[]>();
  readonly pendingIds = input<Set<string>>(new Set());
  readonly today = input.required<Date>();
  readonly markDone = output<CalendarEvent>();

  weekday(date: Date): string {
    return date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
  }
  month(date: Date): string {
    return date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
  }
  isToday(date: Date): boolean {
    return isSameDay(date, this.today());
  }
}
