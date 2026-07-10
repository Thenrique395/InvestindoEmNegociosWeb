import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { AppCurrencyPipe } from '../shared/app-currency.pipe';
import { StatusBadgeComponent } from '../shared/status-badge/status-badge.component';
import { CalendarEvent, categoryFor, statusLabel, statusTone } from './calendar-agenda.model';
import { formatLocaleDate } from '../utils/locale-utils';

/**
 * Cartão de um único compromisso financeiro. Reutilizado no painel do dia,
 * na Agenda e na Timeline. A cor vem do tipo (`data-kind`); o status usa o
 * badge compartilhado.
 */
@Component({
  selector: 'app-financial-event-card',
  standalone: true,
  imports: [AppCurrencyPipe, StatusBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="fe" [attr.data-kind]="event().kind" [class.fe--overdue]="event().status === 'overdue'">
      <span class="fe__rail" aria-hidden="true"></span>
      <span class="fe__icon" aria-hidden="true">{{ category().icon }}</span>

      <div class="fe__body">
        <div class="fe__top">
          <p class="fe__title">{{ event().title }}</p>
          @if (event().amount != null) {
            <strong class="fe__amount">{{ event().amount | appCurrency }}</strong>
          }
        </div>
        <div class="fe__meta">
          <app-status-badge [tone]="tone()" [label]="statusText()" size="sm" [dot]="true" />
          <span class="fe__type">{{ category().label }}</span>
          @if (showDate()) {
            <span class="fe__dot" aria-hidden="true">·</span>
            <span>{{ dateLabel() }}</span>
          }
          @if (event().category) {
            <span class="fe__dot" aria-hidden="true">·</span>
            <span class="fe__category">{{ event().category }}</span>
          }
          @if (event().meta) {
            <span class="fe__dot" aria-hidden="true">·</span>
            <span>{{ event().meta }}</span>
          }
        </div>
      </div>

      @if (event().actionable) {
        <button
          type="button"
          class="fe__action"
          [disabled]="pending()"
          (click)="markDone.emit(event())">
          {{ pending() ? 'Processando…' : actionLabel() }}
        </button>
      }
    </article>
  `,
  styles: `
    :host { display: block; }
    .fe {
      position: relative;
      display: grid;
      grid-template-columns: auto auto minmax(0, 1fr) auto;
      align-items: center;
      gap: 0.7rem;
      padding: 0.75rem 0.9rem 0.75rem 1rem;
      border: 1px solid var(--border);
      border-radius: var(--radius-lg, 14px);
      background: var(--surface);
      --kind: var(--info);
      --kind-weak: var(--color-info-weak);
    }
    .fe[data-kind='income'] { --kind: var(--success); --kind-weak: var(--color-success-weak); }
    .fe[data-kind='expense'] { --kind: var(--danger); --kind-weak: var(--color-danger-weak); }
    .fe[data-kind='card-due'] { --kind: var(--warning); --kind-weak: var(--color-warning-weak); }
    .fe[data-kind='card-close'] { --kind: var(--info); --kind-weak: var(--color-info-weak); }
    .fe[data-kind='loan'] { --kind: var(--warning); --kind-weak: var(--color-warning-weak); }
    .fe[data-kind='goal'] { --kind: var(--info); --kind-weak: var(--color-info-weak); }
    .fe--overdue { border-color: var(--color-danger-soft); }

    .fe__rail {
      position: absolute;
      left: 0; top: 8px; bottom: 8px;
      width: 3px;
      border-radius: 3px;
      background: var(--kind);
    }
    .fe__icon {
      display: grid;
      place-items: center;
      width: 34px; height: 34px;
      border-radius: 10px;
      background: var(--kind-weak);
      color: var(--kind);
      font-size: 1rem;
    }
    .fe__body { min-width: 0; display: grid; gap: 4px; }
    .fe__top { display: flex; align-items: baseline; justify-content: space-between; gap: 0.6rem; }
    .fe__title {
      margin: 0; font-size: var(--text-sm, 0.9rem); font-weight: var(--font-weight-bold, 600);
      color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .fe__amount { font-size: var(--text-sm, 0.9rem); color: var(--text); white-space: nowrap; }
    .fe__meta {
      display: flex; flex-wrap: wrap; align-items: center; gap: 6px;
      font-size: var(--text-xs, 0.75rem); color: var(--text-muted);
    }
    .fe__type { font-weight: 500; }
    .fe__dot { opacity: 0.6; }
    .fe__category { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 12rem; }
    .fe__action {
      justify-self: end;
      border: 1px solid var(--border-strong, var(--border));
      border-radius: var(--radius-md, 10px);
      padding: 6px 12px;
      background: var(--surface-2);
      color: var(--text);
      font-size: var(--text-xs, 0.75rem);
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
      transition: background 0.15s ease, border-color 0.15s ease;
    }
    .fe__action:hover:not(:disabled) { background: var(--kind-weak); border-color: var(--kind); color: var(--kind); }
    .fe__action:disabled { opacity: 0.6; cursor: progress; }
    .fe__action:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }

    @media (max-width: 560px) {
      .fe { grid-template-columns: auto minmax(0, 1fr); }
      .fe__action { grid-column: 1 / -1; justify-self: stretch; text-align: center; }
    }
  `
})
export class FinancialEventCardComponent {
  readonly event = input.required<CalendarEvent>();
  readonly pending = input<boolean>(false);
  /** Exibe a data no rodapé (útil em Agenda/Timeline, não no painel do dia). */
  readonly showDate = input<boolean>(false);
  readonly markDone = output<CalendarEvent>();

  readonly category = computed(() => categoryFor(this.event().kind));
  readonly tone = computed(() => statusTone(this.event().status));
  readonly statusText = computed(() => statusLabel(this.event().status));
  readonly dateLabel = computed(() => formatLocaleDate(this.event().date));
  readonly actionLabel = computed(() => (this.event().group === 'income' ? 'Marcar recebido' : 'Marcar pago'));
}
