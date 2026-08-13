import { Component, input } from '@angular/core';
import { TooltipComponent } from '../tooltip/tooltip.component';

export type StatCardTone = 'primary' | 'success' | 'warning' | 'info' | 'danger';

@Component({
  selector: 'app-stat-card',
  standalone: true,
  imports: [TooltipComponent],
  template: `
    <article [class]="'app-stat-card app-stat-card--' + tone()">
      <div class="app-stat-card__head">
        <span class="app-stat-card__icon" aria-hidden="true">
          <ng-content select="[stat-icon]"></ng-content>
        </span>
        <div class="app-stat-card__copy">
          <p class="app-stat-card__eyebrow">{{ eyebrow() }}</p>
          <h3 class="app-stat-card__value">{{ value() }}</h3>
        </div>
        @if (tooltipText()) {
          <app-tooltip [label]="tooltipLabel() || ('Mais informações sobre ' + eyebrow())" [text]="tooltipText()" />
        }
      </div>
      <p class="app-stat-card__note">
        <ng-content select="[stat-note]"></ng-content>{{ note() }}
      </p>
    </article>
  `,
  styles: [`
    :host { display: block; }

    /* Card de métrica — COMPONENTES.md §3.1(a). Sem gradiente e sem sombra em
       repouso: no redesign os cards são discretos, e a elevação existe só em
       hover e em camadas flutuantes. */
    .app-stat-card {
      display: grid;
      gap: var(--space-6);
      padding: var(--card-padding);
      border: 1px solid var(--border);
      border-radius: var(--radius-card);
      background: var(--surface);
    }





    .app-stat-card__head {
      display: grid;
      grid-template-columns: auto 1fr auto;
      gap: 0.85rem;
      align-items: start;
    }

    .app-stat-card__icon {
      inline-size: 30px;
      block-size: 30px;
      border-radius: var(--radius-sm);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex: 0 0 auto;
      border: 1px solid color-mix(in srgb, var(--primary) 14%, transparent);
      background: color-mix(in srgb, var(--surface) 82%, transparent);
      color: var(--primary-text);
    }

    .app-stat-card__icon ::ng-deep svg {
      inline-size: 1.45rem;
      block-size: 1.45rem;
    }

    .app-stat-card--success .app-stat-card__icon {
      border-color: color-mix(in srgb, var(--income) 18%, transparent);
      background: color-mix(in srgb, var(--income) 12%, transparent);
      color: var(--income-text);
    }

    .app-stat-card--warning .app-stat-card__icon {
      border-color: color-mix(in srgb, var(--warning) 18%, transparent);
      background: color-mix(in srgb, var(--warning) 12%, transparent);
      color: var(--warning-text);
    }

    .app-stat-card--info .app-stat-card__icon {
      border-color: color-mix(in srgb, var(--primary) 16%, transparent);
      background: color-mix(in srgb, var(--primary) 12%, transparent);
      color: var(--primary-text);
    }

    .app-stat-card--danger .app-stat-card__icon {
      border-color: color-mix(in srgb, var(--expense) 18%, transparent);
      background: color-mix(in srgb, var(--expense) 12%, transparent);
      color: var(--expense-text);
    }

    .app-stat-card__copy {
      display: grid;
      gap: 0.35rem;
      min-width: 0;
    }

    .app-stat-card__eyebrow {
      margin: 0;
      font-size: var(--fs-micro);
      font-weight: var(--fw-bold);
      letter-spacing: var(--ls-eyebrow);
      text-transform: uppercase;
      color: var(--text-tertiary);
    }

    .app-stat-card__value {
      margin: 0.15rem 0 0;
      font-size: var(--fs-kpi);
      font-weight: var(--fw-bold);
      line-height: var(--lh-display);
      letter-spacing: var(--ls-tighter);
      color: var(--text);
    }

    .app-stat-card__note {
      margin: 0;
      color: var(--text-tertiary);
      font-size: var(--fs-body);
      font-weight: var(--fw-regular);
      line-height: var(--lh-body);
      max-inline-size: 32ch;
    }
  `]
})
export class StatCardComponent {
  readonly tone = input<StatCardTone>('primary');
  readonly eyebrow = input.required<string>();
  readonly value = input.required<string>();
  readonly note = input<string>('');
  readonly tooltipText = input<string>('');
  readonly tooltipLabel = input<string>('');
}
