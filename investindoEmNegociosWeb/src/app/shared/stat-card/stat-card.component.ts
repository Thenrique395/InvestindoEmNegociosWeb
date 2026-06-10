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

    .app-stat-card {
      display: grid;
      gap: 0.95rem;
      min-height: 220px;
      padding: 1.3rem 1.35rem 1.2rem;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-2xl);
      box-shadow: var(--shadow-elevation-sm);
      background: linear-gradient(135deg, color-mix(in srgb, var(--color-primary) 10%, transparent), var(--color-surface) 58%);
    }

    .app-stat-card--success {
      background: linear-gradient(135deg, color-mix(in srgb, var(--color-success) 9%, transparent), var(--color-surface) 58%);
    }

    .app-stat-card--warning {
      background: linear-gradient(135deg, color-mix(in srgb, var(--color-warning) 9%, transparent), var(--color-surface) 58%);
    }

    .app-stat-card--info {
      background: linear-gradient(135deg, color-mix(in srgb, var(--color-info) 9%, transparent), var(--color-surface) 58%);
    }

    .app-stat-card--danger {
      background: linear-gradient(135deg, color-mix(in srgb, var(--color-danger) 8%, transparent), var(--color-surface) 58%);
    }

    .app-stat-card__head {
      display: grid;
      grid-template-columns: auto 1fr auto;
      gap: 0.85rem;
      align-items: start;
    }

    .app-stat-card__icon {
      inline-size: 3rem;
      block-size: 3rem;
      border-radius: var(--radius-lg);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex: 0 0 auto;
      border: 1px solid color-mix(in srgb, var(--color-primary) 14%, transparent);
      background: color-mix(in srgb, var(--color-surface) 82%, transparent);
      color: var(--color-primary-text);
    }

    .app-stat-card__icon ::ng-deep svg {
      inline-size: 1.45rem;
      block-size: 1.45rem;
    }

    .app-stat-card--success .app-stat-card__icon {
      border-color: color-mix(in srgb, var(--color-success) 18%, transparent);
      background: color-mix(in srgb, var(--color-success) 12%, transparent);
      color: var(--color-success-text);
    }

    .app-stat-card--warning .app-stat-card__icon {
      border-color: color-mix(in srgb, var(--color-warning) 18%, transparent);
      background: color-mix(in srgb, var(--color-warning) 12%, transparent);
      color: var(--color-warning-text);
    }

    .app-stat-card--info .app-stat-card__icon {
      border-color: color-mix(in srgb, var(--color-info) 16%, transparent);
      background: color-mix(in srgb, var(--color-info) 12%, transparent);
      color: var(--color-info-text);
    }

    .app-stat-card--danger .app-stat-card__icon {
      border-color: color-mix(in srgb, var(--color-danger) 18%, transparent);
      background: color-mix(in srgb, var(--color-danger) 12%, transparent);
      color: var(--color-danger-text);
    }

    .app-stat-card__copy {
      display: grid;
      gap: 0.35rem;
      min-width: 0;
    }

    .app-stat-card__eyebrow {
      margin: 0;
      font-size: var(--font-size-card-eyebrow);
      font-weight: var(--font-weight-card-eyebrow);
      letter-spacing: var(--letter-spacing-eyebrow);
      text-transform: uppercase;
      color: var(--color-text-muted);
    }

    .app-stat-card__value {
      margin: 0.15rem 0 0;
      font-size: var(--font-size-card-metric);
      font-weight: var(--font-weight-card-metric);
      line-height: var(--line-height-display);
      letter-spacing: var(--letter-spacing-display);
      color: var(--color-text);
    }

    .app-stat-card__note {
      margin: 0;
      color: var(--color-text-muted);
      font-size: var(--font-size-card-body);
      font-weight: var(--font-weight-card-body);
      line-height: var(--line-height-body);
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
