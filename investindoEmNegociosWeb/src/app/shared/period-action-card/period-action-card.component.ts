import { Component, input } from '@angular/core';

@Component({
  selector: 'app-period-action-card',
  standalone: true,
  template: `
    <aside class="app-period-action-card">
      <p class="app-period-action-card__eyebrow">{{ eyebrow() }}</p>
      <strong class="app-period-action-card__title">{{ title() }}</strong>
      <p class="app-period-action-card__text">{{ description() }}</p>
      <ng-content select="[action-card-extra]"></ng-content>
      <div class="app-period-action-card__actions">
        <ng-content select="[action-card-actions]"></ng-content>
      </div>
    </aside>
  `,
  styles: [`
    :host { display: contents; }

    .app-period-action-card {
      border: 1px solid var(--border);
      border-radius: var(--radius-2xl);
      background: linear-gradient(135deg, color-mix(in srgb, var(--surface-2) 80%, white), color-mix(in srgb, var(--surface) 90%, white));
      box-shadow: var(--shadow-sm);
      padding: 1.45rem 1.4rem 1.3rem;
      display: grid;
      gap: 0.95rem;
    }

    .app-period-action-card__eyebrow {
      margin: 0;
      font-size: var(--font-size-caption);
      font-weight: var(--font-weight-bold);
      letter-spacing: var(--letter-spacing-eyebrow);
      text-transform: uppercase;
      color: var(--text-muted);
    }

    .app-period-action-card__title {
      margin: 0;
      font-size: var(--font-size-body-lg);
      font-weight: var(--font-weight-semibold);
      letter-spacing: var(--letter-spacing-title);
      line-height: var(--line-height-tight);
      color: var(--text);
    }

    .app-period-action-card__text {
      margin: 0;
      color: var(--text-secondary);
      font-size: var(--font-size-body-sm);
      line-height: var(--line-height-body);
    }

    .app-period-action-card__actions {
      display: grid;
      gap: 0.7rem;
    }

    .app-period-action-card__actions ::ng-deep .period-total-card__action {
      border-radius: var(--radius-xl);
      border: 1px solid var(--border);
      min-height: 58px;
      padding: 0.8rem 0.95rem;
      display: grid;
      grid-template-columns: auto 1fr;
      align-items: center;
      gap: 0.75rem;
      text-align: left;
      transition:
        transform 160ms ease,
        border-color 160ms ease,
        background 160ms ease,
        box-shadow 160ms ease;
    }

    .app-period-action-card__actions ::ng-deep .period-total-card__action:hover {
      transform: translateY(-1px);
    }

    .app-period-action-card__actions ::ng-deep .period-total-card__action:disabled {
      opacity: 0.6;
      pointer-events: none;
      transform: none;
    }

    .app-period-action-card__actions ::ng-deep .period-total-card__action--ghost {
      background: color-mix(in srgb, var(--surface) 90%, white);
      color: var(--text);
    }

    .app-period-action-card__actions ::ng-deep .period-total-card__action--ghost:hover {
      border-color: color-mix(in srgb, var(--primary) 22%, transparent);
      background: color-mix(in srgb, var(--surface) 96%, white);
    }

    .app-period-action-card__actions ::ng-deep .period-total-card__action--primary {
      border-color: color-mix(in srgb, var(--primary) 14%, transparent);
      background: linear-gradient(
        135deg,
        color-mix(in srgb, var(--primary) 92%, white),
        color-mix(in srgb, var(--primary) 76%, black)
      );
      color: white;
      box-shadow: 0 18px 32px color-mix(in srgb, var(--primary) 28%, transparent);
    }

    .app-period-action-card__actions ::ng-deep .period-total-card__action-icon {
      inline-size: 38px;
      block-size: 38px;
      border-radius: var(--radius-md);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: color-mix(in srgb, var(--surface-2) 74%, white);
      color: var(--primary-text);
    }

    .app-period-action-card__actions ::ng-deep .period-total-card__action-icon svg {
      inline-size: 18px;
      block-size: 18px;
    }

    .app-period-action-card__actions ::ng-deep .period-total-card__action--primary .period-total-card__action-icon {
      background: color-mix(in srgb, white 18%, transparent);
      color: white;
    }

    .app-period-action-card__actions ::ng-deep .period-total-card__action-copy {
      display: grid;
      gap: 0.15rem;
    }

    .app-period-action-card__actions ::ng-deep .period-total-card__action-copy strong {
      font-size: var(--font-size-body);
      font-weight: var(--font-weight-semibold);
      line-height: var(--line-height-tight);
      letter-spacing: var(--letter-spacing-title);
    }

    .app-period-action-card__actions ::ng-deep .period-total-card__action-copy small {
      font-size: var(--font-size-label);
      line-height: var(--line-height-control);
      color: var(--text-muted);
    }

    .app-period-action-card__actions ::ng-deep .period-total-card__action--primary .period-total-card__action-copy small {
      color: color-mix(in srgb, white 80%, transparent);
    }
  `]
})
export class PeriodActionCardComponent {
  readonly eyebrow = input<string>('Próxima ação');
  readonly title = input.required<string>();
  readonly description = input<string>('');
}
