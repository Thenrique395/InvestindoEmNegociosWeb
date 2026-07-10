import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FinancialEventCardComponent } from './financial-event-card.component';
import { CalendarEvent, TimelineBucket } from './calendar-agenda.model';

/**
 * Visão Timeline: faixas cronológicas (Hoje → Amanhã → Semana → Mês → adiante).
 * Útil para quem prefere um fluxo linear em vez da grade mensal.
 */
@Component({
  selector: 'app-financial-timeline',
  standalone: true,
  imports: [FinancialEventCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ol class="tl">
      @for (bucket of visibleBuckets(); track bucket.key) {
        <li class="tl__bucket">
          <div class="tl__marker" aria-hidden="true">
            <span class="tl__node" [attr.data-key]="bucket.key"></span>
            <span class="tl__line"></span>
          </div>
          <div class="tl__content">
            <div class="tl__head">
              <h3 class="tl__label">{{ bucket.label }}</h3>
              <span class="tl__count">{{ bucket.events.length }}</span>
            </div>
            <div class="tl__events">
              @for (event of bucket.events; track event.id) {
                <app-financial-event-card
                  [event]="event"
                  [showDate]="true"
                  [pending]="pendingIds().has(event.id)"
                  (markDone)="markDone.emit($event)" />
              }
            </div>
          </div>
        </li>
      }
    </ol>
  `,
  styles: `
    :host { display: block; }
    .tl { list-style: none; margin: 0; padding: 0; display: grid; gap: 0; }
    .tl__bucket { display: grid; grid-template-columns: 28px minmax(0, 1fr); gap: 0.9rem; }
    .tl__marker { display: grid; justify-items: center; }
    .tl__node {
      width: 14px; height: 14px; margin-top: 4px; border-radius: 50%;
      background: var(--surface); border: 3px solid var(--primary);
    }
    .tl__node[data-key='today'] { background: var(--primary); }
    .tl__line { width: 2px; flex: 1; background: var(--border); border-radius: 2px; }
    .tl__bucket:last-child .tl__line { display: none; }
    .tl__content { padding-bottom: 1.4rem; display: grid; gap: 0.7rem; }
    .tl__head { display: flex; align-items: center; gap: 8px; }
    .tl__label { margin: 0; font-size: var(--text-sm, 0.9rem); font-weight: 700; color: var(--text); }
    .tl__count {
      display: inline-grid; place-items: center; min-width: 20px; height: 20px; padding: 0 6px;
      border-radius: 10px; background: var(--surface-3); color: var(--text-muted);
      font-size: 0.68rem; font-weight: 700;
    }
    .tl__events { display: grid; gap: 8px; }
  `
})
export class FinancialTimelineComponent {
  readonly buckets = input.required<TimelineBucket[]>();
  readonly pendingIds = input<Set<string>>(new Set());
  readonly markDone = output<CalendarEvent>();

  visibleBuckets(): TimelineBucket[] {
    return this.buckets().filter((bucket) => bucket.events.length > 0);
  }
}
